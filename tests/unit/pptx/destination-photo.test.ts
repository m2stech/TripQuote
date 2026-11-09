import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/features/pptx/images/google-places-photo", () => ({ fetchGooglePlacesPhoto: vi.fn() }));
vi.mock("@/features/pptx/images/wikipedia-photo", () => ({ fetchWikipediaPhoto: vi.fn() }));
vi.mock("@/features/pptx/images/fetch-external-image", () => ({ fetchExternalImage: vi.fn() }));
vi.mock("@/features/ai/orchestration/find-alternative-photo", () => ({ findAlternativePhoto: vi.fn() }));

import { fetchGooglePlacesPhoto } from "@/features/pptx/images/google-places-photo";
import { fetchWikipediaPhoto } from "@/features/pptx/images/wikipedia-photo";
import { fetchExternalImage } from "@/features/pptx/images/fetch-external-image";
import { findAlternativePhoto } from "@/features/ai/orchestration/find-alternative-photo";
import { resolveDestinationPhoto } from "@/features/pptx/images/destination-photo";

const box = { w: 4, h: 3 };
const destination = "Balneário Camboriú";
const aiNotFound = { status: "not_found" as const, url: null, sourceUrl: null, caption: null };

// Resolução alta o bastante para passar no filtro de qualidade mínima
// (`meetsMinimumResolution`) para `box = { w: 4, h: 3 }` — ver
// resolve-image-sizing.ts.
async function createPngBuffer(): Promise<Buffer> {
  const sharp = (await import("sharp")).default;
  return sharp({ create: { width: 800, height: 600, channels: 3, background: { r: 10, g: 10, b: 10 } } })
    .png()
    .toBuffer();
}

describe("resolveDestinationPhoto", () => {
  beforeEach(() => {
    vi.mocked(fetchGooglePlacesPhoto).mockReset();
    vi.mocked(fetchWikipediaPhoto).mockReset();
    vi.mocked(fetchExternalImage).mockReset();
    vi.mocked(findAlternativePhoto).mockReset();
  });

  it("usa a foto do Google Places quando disponível, sem tentar mais nada", async () => {
    vi.mocked(fetchGooglePlacesPhoto).mockResolvedValue({
      ok: true,
      value: { buffer: await createPngBuffer(), mimeType: "image/jpeg" },
    });

    const result = await resolveDestinationPhoto(destination, aiNotFound, box);

    expect(fetchGooglePlacesPhoto).toHaveBeenCalledWith(`ponto turístico em ${destination}`);
    expect(result.image.kind).toBe("image");
    expect(result.attempts).toEqual([]);
    expect(fetchWikipediaPhoto).not.toHaveBeenCalled();
    expect(fetchExternalImage).not.toHaveBeenCalled();
    expect(findAlternativePhoto).not.toHaveBeenCalled();
  });

  it("sem Google Places, usa a foto da Wikipedia quando disponível", async () => {
    vi.mocked(fetchGooglePlacesPhoto).mockResolvedValue({ ok: false, reason: "sem resultado" });
    vi.mocked(fetchWikipediaPhoto).mockResolvedValue({
      ok: true,
      value: { buffer: await createPngBuffer(), mimeType: "image/png" },
    });

    const result = await resolveDestinationPhoto(destination, aiNotFound, box);

    expect(result.image.kind).toBe("image");
    expect(fetchExternalImage).not.toHaveBeenCalled();
    expect(findAlternativePhoto).not.toHaveBeenCalled();
  });

  it("sem Google Places e sem Wikipedia, usa a URL da IA quando real_photo_found", async () => {
    vi.mocked(fetchGooglePlacesPhoto).mockResolvedValue({ ok: false, reason: "sem resultado" });
    vi.mocked(fetchWikipediaPhoto).mockResolvedValue({ ok: false, reason: "sem artigo" });
    vi.mocked(fetchExternalImage).mockResolvedValue({
      ok: true,
      value: { buffer: await createPngBuffer(), mimeType: "image/png" },
    });

    const result = await resolveDestinationPhoto(
      destination,
      { status: "real_photo_found", url: "https://example.com/destino.jpg", sourceUrl: null, caption: null },
      box,
    );

    expect(result.image.kind).toBe("image");
    expect(findAlternativePhoto).not.toHaveBeenCalled();
  });

  it("nenhuma fonte determinística e sem aiPhoto válida: placeholder direto, com o diagnóstico completo", async () => {
    vi.mocked(fetchGooglePlacesPhoto).mockResolvedValue({ ok: false, reason: "GOOGLE_PLACES_API_KEY não configurada" });
    vi.mocked(fetchWikipediaPhoto).mockResolvedValue({ ok: false, reason: "artigo sem imagem" });

    const result = await resolveDestinationPhoto(destination, aiNotFound, box);

    expect(result.image).toEqual({ kind: "placeholder" });
    expect(result.attempts).toEqual([
      { source: "Google Places", reason: "GOOGLE_PLACES_API_KEY não configurada" },
      { source: "Wikipedia", reason: "artigo sem imagem" },
      { source: "URL da IA", reason: "aiOutput sem foto confirmada (status !== real_photo_found)" },
    ]);
    expect(fetchExternalImage).not.toHaveBeenCalled();
  });

  it("Places, Wikipedia e URL da IA falham, retry encontra alternativa: usa a nova foto", async () => {
    vi.mocked(fetchGooglePlacesPhoto).mockResolvedValue({ ok: false, reason: "sem resultado" });
    vi.mocked(fetchWikipediaPhoto).mockResolvedValue({ ok: false, reason: "sem artigo" });
    vi.mocked(fetchExternalImage)
      .mockResolvedValueOnce({ ok: false, reason: "HTTP 404" })
      .mockResolvedValueOnce({ ok: true, value: { buffer: await createPngBuffer(), mimeType: "image/png" } });
    vi.mocked(findAlternativePhoto).mockResolvedValue({
      photo: { status: "real_photo_found", url: "https://commons.wikimedia.org/alt.jpg", sourceUrl: null, caption: null },
    });

    const result = await resolveDestinationPhoto(
      destination,
      { status: "real_photo_found", url: "https://morta.example.com/destino.jpg", sourceUrl: null, caption: null },
      box,
    );

    expect(result.image.kind).toBe("image");
  });

  it("todas as fontes falham: placeholder com o diagnóstico completo", async () => {
    vi.mocked(fetchGooglePlacesPhoto).mockResolvedValue({ ok: false, reason: "sem resultado" });
    vi.mocked(fetchWikipediaPhoto).mockResolvedValue({ ok: false, reason: "sem artigo" });
    vi.mocked(fetchExternalImage).mockResolvedValue({ ok: false, reason: "HTTP 404" });
    vi.mocked(findAlternativePhoto).mockResolvedValue({ photo: aiNotFound });

    const result = await resolveDestinationPhoto(
      destination,
      { status: "real_photo_found", url: "https://morta.example.com/destino.jpg", sourceUrl: null, caption: null },
      box,
    );

    expect(result.image).toEqual({ kind: "placeholder" });
    expect(result.attempts).toEqual([
      { source: "Google Places", reason: "sem resultado" },
      { source: "Wikipedia", reason: "sem artigo" },
      { source: "URL da IA (https://morta.example.com/destino.jpg)", reason: "HTTP 404" },
      { source: "Retry da IA", reason: "não encontrou foto alternativa" },
    ]);
  });

  it("foto do Google Places com resolução baixa é rejeitada, cai para Wikipedia", async () => {
    const smallBuffer = await (
      await import("sharp")
    )
      .default({ create: { width: 100, height: 75, channels: 3, background: { r: 1, g: 1, b: 1 } } })
      .png()
      .toBuffer();
    vi.mocked(fetchGooglePlacesPhoto).mockResolvedValue({
      ok: true,
      value: { buffer: smallBuffer, mimeType: "image/jpeg" },
    });
    vi.mocked(fetchWikipediaPhoto).mockResolvedValue({
      ok: true,
      value: { buffer: await createPngBuffer(), mimeType: "image/png" },
    });

    const result = await resolveDestinationPhoto(destination, aiNotFound, box);

    expect(result.image.kind).toBe("image");
    expect(fetchWikipediaPhoto).toHaveBeenCalled();
  });
});
