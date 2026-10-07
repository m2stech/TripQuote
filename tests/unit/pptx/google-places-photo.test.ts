import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { fetchGooglePlacesPhoto } from "@/features/pptx/images/google-places-photo";

const originalApiKey = process.env.GOOGLE_PLACES_API_KEY;

describe("fetchGooglePlacesPhoto", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
    process.env.GOOGLE_PLACES_API_KEY = "fake-key";
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    process.env.GOOGLE_PLACES_API_KEY = originalApiKey;
  });

  it("retorna null imediatamente quando GOOGLE_PLACES_API_KEY não está configurada, sem chamar fetch", async () => {
    delete process.env.GOOGLE_PLACES_API_KEY;
    const result = await fetchGooglePlacesPhoto("Hotel Teste, Cidade");
    expect(result).toBeNull();
    expect(fetch).not.toHaveBeenCalled();
  });

  it("busca com sucesso: searchText -> media -> imagem", async () => {
    vi.mocked(fetch)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ places: [{ photos: [{ name: "places/abc/photos/xyz" }] }] }),
      } as never)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ photoUri: "https://lh3.googleusercontent.com/foto.jpg" }),
      } as never)
      .mockResolvedValueOnce({
        ok: true,
        headers: new Headers({ "content-type": "image/jpeg" }),
        arrayBuffer: async () => new TextEncoder().encode("fake-image").buffer,
      } as never);

    const result = await fetchGooglePlacesPhoto("Hotel Brasil Express, Balneário Camboriú");

    expect(result).not.toBeNull();
    expect(result?.mimeType).toBe("image/jpeg");
  });

  it("retorna null quando searchText não encontra nenhum place", async () => {
    vi.mocked(fetch).mockResolvedValueOnce({ ok: true, json: async () => ({ places: [] }) } as never);
    const result = await fetchGooglePlacesPhoto("Hotel Inexistente Xyz123");
    expect(result).toBeNull();
  });

  it("retorna null quando searchText falha (status não-ok)", async () => {
    vi.mocked(fetch).mockResolvedValueOnce({ ok: false } as never);
    const result = await fetchGooglePlacesPhoto("Hotel Teste");
    expect(result).toBeNull();
  });

  it("retorna null quando a chamada de media falha", async () => {
    vi.mocked(fetch)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ places: [{ photos: [{ name: "places/abc/photos/xyz" }] }] }),
      } as never)
      .mockResolvedValueOnce({ ok: false } as never);

    const result = await fetchGooglePlacesPhoto("Hotel Teste");
    expect(result).toBeNull();
  });

  it("retorna null em erro de rede, sem lançar", async () => {
    vi.mocked(fetch).mockRejectedValueOnce(new Error("network error"));
    await expect(fetchGooglePlacesPhoto("Hotel Teste")).resolves.toBeNull();
  });
});
