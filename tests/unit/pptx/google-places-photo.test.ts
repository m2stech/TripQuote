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

  it("retorna falha imediata quando GOOGLE_PLACES_API_KEY não está configurada, sem chamar fetch", async () => {
    delete process.env.GOOGLE_PLACES_API_KEY;
    const result = await fetchGooglePlacesPhoto("Hotel Teste, Cidade");
    expect(result).toEqual({ ok: false, reason: "GOOGLE_PLACES_API_KEY não configurada" });
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

    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error("expected ok");
    expect(result.value.mimeType).toBe("image/jpeg");
  });

  it("retorna falha quando searchText não encontra nenhum place", async () => {
    vi.mocked(fetch).mockResolvedValueOnce({ ok: true, json: async () => ({ places: [] }) } as never);
    const result = await fetchGooglePlacesPhoto("Hotel Inexistente Xyz123");
    expect(result).toEqual({ ok: false, reason: "nenhum lugar/foto encontrado para a busca" });
  });

  it("retorna o motivo da falha quando searchText falha (status não-ok)", async () => {
    vi.mocked(fetch).mockResolvedValueOnce({ ok: false, status: 500 } as never);
    const result = await fetchGooglePlacesPhoto("Hotel Teste");
    expect(result).toEqual({ ok: false, reason: "HTTP 500 na busca de lugar" });
  });

  it("retorna o motivo da falha quando a chamada de media falha", async () => {
    vi.mocked(fetch)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ places: [{ photos: [{ name: "places/abc/photos/xyz" }] }] }),
      } as never)
      .mockResolvedValueOnce({ ok: false, status: 403 } as never);

    const result = await fetchGooglePlacesPhoto("Hotel Teste");
    expect(result).toEqual({ ok: false, reason: "HTTP 403 ao resolver mídia da foto" });
  });

  it("retorna o motivo da falha em erro de rede, sem lançar", async () => {
    vi.mocked(fetch).mockRejectedValueOnce(new Error("network error"));
    const result = await fetchGooglePlacesPhoto("Hotel Teste");
    expect(result).toEqual({ ok: false, reason: "network error" });
  });
});
