import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/features/ai/client/openai-client", () => ({
  getOpenAiClient: vi.fn(),
}));

import { getOpenAiClient } from "@/features/ai/client/openai-client";
import { findAlternativePhoto } from "@/features/ai/orchestration/find-alternative-photo";

function mockResponsesParse(result: { output_parsed: unknown } | { throws: Error }) {
  const parse = vi.fn();
  if ("throws" in result) {
    parse.mockRejectedValueOnce(result.throws);
  } else {
    parse.mockResolvedValueOnce(result);
  }
  vi.mocked(getOpenAiClient).mockReturnValue({ responses: { parse } } as never);
  return parse;
}

describe("findAlternativePhoto", () => {
  beforeEach(() => {
    vi.mocked(getOpenAiClient).mockReset();
  });

  it("retorna a foto encontrada quando a chamada é bem-sucedida", async () => {
    mockResponsesParse({
      output_parsed: {
        status: "real_photo_found",
        url: "https://commons.wikimedia.org/foto-alternativa.jpg",
        sourceUrl: "https://commons.wikimedia.org/wiki/File:foto-alternativa.jpg",
        caption: null,
      },
    });

    const result = await findAlternativePhoto({
      subject: "o destino Balneário Camboriú",
      failedUrl: "https://morta.example.com/foto.jpg",
    });

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
});
