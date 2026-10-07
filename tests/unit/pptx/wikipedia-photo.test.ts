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
    vi.mocked(fetchExternalImage).mockResolvedValue({ buffer: Buffer.from("img"), mimeType: "image/jpeg" });

    const result = await fetchWikipediaPhoto("Balneário Camboriú");

    expect(fetchExternalImage).toHaveBeenCalledWith("https://thumb.wikimedia.org/original.jpg");
    expect(result).not.toBeNull();
  });

  it("usa thumbnail quando não há originalimage", async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ thumbnail: { source: "https://thumb.wikimedia.org/thumb.jpg" } }),
    } as never);
    vi.mocked(fetchExternalImage).mockResolvedValue({ buffer: Buffer.from("img"), mimeType: "image/jpeg" });

    await fetchWikipediaPhoto("Balneário Camboriú");

    expect(fetchExternalImage).toHaveBeenCalledWith("https://thumb.wikimedia.org/thumb.jpg");
  });

  it("retorna null quando o artigo não existe (404)", async () => {
    vi.mocked(fetch).mockResolvedValueOnce({ ok: false } as never);
    const result = await fetchWikipediaPhoto("Destino Inexistente Xyz123");
    expect(result).toBeNull();
    expect(fetchExternalImage).not.toHaveBeenCalled();
  });

  it("retorna null quando o artigo existe mas não tem imagem", async () => {
    vi.mocked(fetch).mockResolvedValueOnce({ ok: true, json: async () => ({}) } as never);
    const result = await fetchWikipediaPhoto("Artigo sem imagem");
    expect(result).toBeNull();
    expect(fetchExternalImage).not.toHaveBeenCalled();
  });

  it("retorna null em erro de rede, sem lançar", async () => {
    vi.mocked(fetch).mockRejectedValueOnce(new Error("network error"));
    await expect(fetchWikipediaPhoto("Qualquer destino")).resolves.toBeNull();
  });
});
