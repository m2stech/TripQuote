import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/features/pptx/images/fetch-external-image", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/features/pptx/images/fetch-external-image")>();
  return { ...actual, fetchExternalImage: vi.fn() };
});

import { fetchExternalImage } from "@/features/pptx/images/fetch-external-image";
import { fetchWikipediaPhoto } from "@/features/pptx/images/wikipedia-photo";

describe("fetchWikipediaPhoto", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
    vi.mocked(fetchExternalImage).mockReset();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("busca a imagem original quando o artigo existe e tem originalimage", async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        originalimage: { source: "https://thumb.wikimedia.org/original.jpg" },
        thumbnail: { source: "https://thumb.wikimedia.org/thumb.jpg" },
      }),
    } as never);
    vi.mocked(fetchExternalImage).mockResolvedValue({
      ok: true,
      value: { buffer: Buffer.from("img"), mimeType: "image/jpeg" },
    });

    const result = await fetchWikipediaPhoto("Balneário Camboriú");

    expect(fetchExternalImage).toHaveBeenCalledWith("https://thumb.wikimedia.org/original.jpg");
    expect(result.ok).toBe(true);
  });

  it("usa thumbnail quando não há originalimage", async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ thumbnail: { source: "https://thumb.wikimedia.org/thumb.jpg" } }),
    } as never);
    vi.mocked(fetchExternalImage).mockResolvedValue({
      ok: true,
      value: { buffer: Buffer.from("img"), mimeType: "image/jpeg" },
    });

    await fetchWikipediaPhoto("Balneário Camboriú");

    expect(fetchExternalImage).toHaveBeenCalledWith("https://thumb.wikimedia.org/thumb.jpg");
  });

  it("retorna o motivo da falha quando o artigo não existe (404)", async () => {
    vi.mocked(fetch).mockResolvedValueOnce({ ok: false, status: 404 } as never);
    const result = await fetchWikipediaPhoto("Destino Inexistente Xyz123");
    expect(result).toEqual({ ok: false, reason: "HTTP 404 ao buscar artigo" });
    expect(fetchExternalImage).not.toHaveBeenCalled();
  });

  it("retorna o motivo da falha quando o artigo existe mas não tem imagem", async () => {
    vi.mocked(fetch).mockResolvedValueOnce({ ok: true, json: async () => ({}) } as never);
    const result = await fetchWikipediaPhoto("Artigo sem imagem");
    expect(result).toEqual({ ok: false, reason: "artigo sem imagem" });
    expect(fetchExternalImage).not.toHaveBeenCalled();
  });

  it("retorna o motivo da falha em erro de rede, sem lançar", async () => {
    vi.mocked(fetch).mockRejectedValueOnce(new Error("network error"));
    const result = await fetchWikipediaPhoto("Qualquer destino");
    expect(result).toEqual({ ok: false, reason: "network error" });
  });
});
