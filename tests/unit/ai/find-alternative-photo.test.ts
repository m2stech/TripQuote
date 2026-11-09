import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/features/ai/client/openai-client", () => ({
  getOpenAiClient: vi.fn(),
}));
vi.mock("@/features/pptx/images/fetch-external-image", () => ({
  fetchExternalImage: vi.fn(),
}));

import { getOpenAiClient } from "@/features/ai/client/openai-client";
import { findAlternativePhoto } from "@/features/ai/orchestration/find-alternative-photo";
import { fetchExternalImage } from "@/features/pptx/images/fetch-external-image";

function mockResponsesParse(
  ...results: Array<{ output_parsed: unknown } | { throws: Error }>
) {
  const parse = vi.fn();
  results.forEach((result) => {
    if ("throws" in result) {
      parse.mockRejectedValueOnce(result.throws);
    } else {
      parse.mockResolvedValueOnce(result);
    }
  });
  vi.mocked(getOpenAiClient).mockReturnValue({ responses: { parse } } as never);
  return parse;
}

describe("findAlternativePhoto", () => {
  beforeEach(() => {
    vi.mocked(getOpenAiClient).mockReset();
    vi.mocked(fetchExternalImage).mockReset();
  });

  it("retorna a foto quando a URL sugerida é confirmada acessível", async () => {
    const parse = mockResponsesParse({
      output_parsed: {
        status: "real_photo_found",
        url: "https://commons.wikimedia.org/foto-alternativa.jpg",
        sourceUrl: "https://commons.wikimedia.org/wiki/File:foto-alternativa.jpg",
        caption: null,
      },
    });
    vi.mocked(fetchExternalImage).mockResolvedValue({
      ok: true,
      value: { buffer: Buffer.from("img"), mimeType: "image/jpeg" },
    });

    const result = await findAlternativePhoto({
      subject: "o destino Balneário Camboriú",
      failedUrl: "https://morta.example.com/foto.jpg",
    });

    expect(parse).toHaveBeenCalledTimes(1);
    expect(result.photo.status).toBe("real_photo_found");
    expect(result.photo.url).toBe("https://commons.wikimedia.org/foto-alternativa.jpg");
  });

  it("retorna not_found quando output_parsed é null (recusa do modelo)", async () => {
    mockResponsesParse({ output_parsed: null });

    const result = await findAlternativePhoto({
      subject: "o hotel X",
      failedUrl: "https://morta.example.com/foto.jpg",
    });

    expect(result.photo.status).toBe("not_found");
    expect(result.photo.url).toBeNull();
    expect(fetchExternalImage).not.toHaveBeenCalled();
  });

  it("retorna not_found quando a resposta não bate com o schema", async () => {
    mockResponsesParse({ output_parsed: { status: "algo_invalido" } });

    const result = await findAlternativePhoto({
      subject: "o hotel X",
      failedUrl: "https://morta.example.com/foto.jpg",
    });

    expect(result.photo.status).toBe("not_found");
  });

  it("nunca lança: erro de rede/API vira not_found", async () => {
    mockResponsesParse({ throws: new Error("network error") });

    await expect(
      findAlternativePhoto({ subject: "o hotel X", failedUrl: "https://morta.example.com/foto.jpg" }),
    ).resolves.toEqual({ photo: { status: "not_found", url: null, sourceUrl: null, caption: null } });
  });

  it("caso relatado: 1ª URL sugerida também dá 404, tenta de novo e aceita a 2ª quando válida", async () => {
    const parse = mockResponsesParse(
      {
        output_parsed: {
          status: "real_photo_found",
          url: "https://upload.wikimedia.org/primeira-tentativa.jpg",
          sourceUrl: null,
          caption: null,
        },
      },
      {
        output_parsed: {
          status: "real_photo_found",
          url: "https://upload.wikimedia.org/segunda-tentativa.jpg",
          sourceUrl: null,
          caption: null,
        },
      },
    );
    vi.mocked(fetchExternalImage)
      .mockResolvedValueOnce({ ok: false, reason: "HTTP 404" })
      .mockResolvedValueOnce({ ok: true, value: { buffer: Buffer.from("img"), mimeType: "image/jpeg" } });

    const result = await findAlternativePhoto({
      subject: "o hotel The Ritz Toronto",
      failedUrl: "https://dynamic-media-cdn.tripadvisor.com/original.jpg",
    });

    expect(parse).toHaveBeenCalledTimes(2);
    // A 2ª chamada deve informar a URL da 1ª tentativa como também morta, além da original.
    const secondCallInput = parse.mock.calls[1]![0].input[0].content[0].text as string;
    expect(secondCallInput).toContain("https://dynamic-media-cdn.tripadvisor.com/original.jpg");
    expect(secondCallInput).toContain("https://upload.wikimedia.org/primeira-tentativa.jpg");
    expect(result.photo.url).toBe("https://upload.wikimedia.org/segunda-tentativa.jpg");
  });

  it("caso relatado: todas as tentativas (original + retry) dão 404, devolve not_found sem mais chamadas", async () => {
    const parse = mockResponsesParse(
      {
        output_parsed: {
          status: "real_photo_found",
          url: "https://upload.wikimedia.org/primeira-tentativa.jpg",
          sourceUrl: null,
          caption: null,
        },
      },
      {
        output_parsed: {
          status: "real_photo_found",
          url: "https://upload.wikimedia.org/segunda-tentativa.jpg",
          sourceUrl: null,
          caption: null,
        },
      },
    );
    vi.mocked(fetchExternalImage).mockResolvedValue({ ok: false, reason: "HTTP 404" });

    const result = await findAlternativePhoto({
      subject: "o hotel Quebec City Marriot Downtown",
      failedUrl: "https://dynamic-media-cdn.tripadvisor.com/original.jpg",
    });

    expect(parse).toHaveBeenCalledTimes(2);
    expect(result.photo).toEqual({ status: "not_found", url: null, sourceUrl: null, caption: null });
  });

  it("não tenta baixar/validar quando a IA já devolve not_found na 1ª tentativa", async () => {
    mockResponsesParse({
      output_parsed: { status: "not_found", url: null, sourceUrl: null, caption: null },
    });

    const result = await findAlternativePhoto({
      subject: "o hotel X",
      failedUrl: "https://morta.example.com/foto.jpg",
    });

    expect(result.photo.status).toBe("not_found");
    expect(fetchExternalImage).not.toHaveBeenCalled();
  });
});
