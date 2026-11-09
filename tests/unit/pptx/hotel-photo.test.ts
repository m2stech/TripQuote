import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/features/pptx/images/google-places-photo", () => ({ fetchGooglePlacesPhoto: vi.fn() }));
vi.mock("@/features/pptx/images/fetch-external-image", () => ({ fetchExternalImage: vi.fn() }));
vi.mock("@/features/ai/orchestration/find-alternative-photo", () => ({ findAlternativePhoto: vi.fn() }));

import { fetchGooglePlacesPhoto } from "@/features/pptx/images/google-places-photo";
import { fetchExternalImage } from "@/features/pptx/images/fetch-external-image";
import { findAlternativePhoto } from "@/features/ai/orchestration/find-alternative-photo";
import { resolveHotelPhoto } from "@/features/pptx/images/hotel-photo";

const box = { w: 3, h: 2 };
const hotelName = "Hotel Brasil Express";
const location = "Balneário Camboriú, SC";

// Resolução alta o bastante para passar no filtro de qualidade mínima
// (`meetsMinimumResolution`) para `box = { w: 3, h: 2 }` — ver
// resolve-image-sizing.ts.
async function createPngBuffer(): Promise<Buffer> {
  const sharp = (await import("sharp")).default;
  return sharp({ create: { width: 600, height: 400, channels: 3, background: { r: 0, g: 0, b: 0 } } })
    .png()
    .toBuffer();
}

describe("resolveHotelPhoto", () => {
  beforeEach(() => {
    vi.mocked(fetchGooglePlacesPhoto).mockReset();
    vi.mocked(fetchExternalImage).mockReset();
    vi.mocked(findAlternativePhoto).mockReset();
  });

  it("usa a foto do Google Places quando disponível, sem tentar mais nada", async () => {
    vi.mocked(fetchGooglePlacesPhoto).mockResolvedValue({
      ok: true,
      value: { buffer: await createPngBuffer(), mimeType: "image/jpeg" },
    });

    const result = await resolveHotelPhoto(hotelName, location, null, box);

    expect(fetchGooglePlacesPhoto).toHaveBeenCalledWith(`${hotelName}, ${location}`);
    expect(result.image.kind).toBe("image");
    expect(result.attempts).toEqual([]);
    expect(fetchExternalImage).not.toHaveBeenCalled();
  });

  it("usa só o nome do hotel na busca quando não há location", async () => {
    vi.mocked(fetchGooglePlacesPhoto).mockResolvedValue({ ok: false, reason: "sem resultado" });
    await resolveHotelPhoto(hotelName, null, null, box);
    expect(fetchGooglePlacesPhoto).toHaveBeenCalledWith(hotelName);
  });

  it("sem Google Places e sem aiPhoto: placeholder direto, com o motivo registrado", async () => {
    vi.mocked(fetchGooglePlacesPhoto).mockResolvedValue({ ok: false, reason: "GOOGLE_PLACES_API_KEY não configurada" });

    const result = await resolveHotelPhoto(hotelName, location, null, box);

    expect(result.image).toEqual({ kind: "placeholder" });
    expect(result.attempts).toEqual([
      { source: "Google Places", reason: "GOOGLE_PLACES_API_KEY não configurada" },
      { source: "URL da IA", reason: "aiOutput sem foto confirmada (status !== real_photo_found)" },
    ]);
    expect(fetchExternalImage).not.toHaveBeenCalled();
  });

  it("sem Google Places, usa a URL da IA quando real_photo_found", async () => {
    vi.mocked(fetchGooglePlacesPhoto).mockResolvedValue({ ok: false, reason: "sem resultado" });
    vi.mocked(fetchExternalImage).mockResolvedValue({
      ok: true,
      value: { buffer: await createPngBuffer(), mimeType: "image/png" },
    });

    const result = await resolveHotelPhoto(
      hotelName,
      location,
      { status: "real_photo_found", url: "https://example.com/hotel.jpg", sourceUrl: null, caption: null },
      box,
    );

    expect(result.image.kind).toBe("image");
    expect(findAlternativePhoto).not.toHaveBeenCalled();
  });

  it("Places e URL da IA falham, retry encontra alternativa: usa a nova foto", async () => {
    vi.mocked(fetchGooglePlacesPhoto).mockResolvedValue({ ok: false, reason: "sem resultado" });
    vi.mocked(fetchExternalImage)
      .mockResolvedValueOnce({ ok: false, reason: "HTTP 404" })
      .mockResolvedValueOnce({ ok: true, value: { buffer: await createPngBuffer(), mimeType: "image/png" } });
    vi.mocked(findAlternativePhoto).mockResolvedValue({
      photo: {
        status: "real_photo_found",
        url: "https://commons.wikimedia.org/hotel-alt.jpg",
        sourceUrl: null,
        caption: null,
      },
    });

    const result = await resolveHotelPhoto(
      hotelName,
      location,
      { status: "real_photo_found", url: "https://morta.example.com/hotel.jpg", sourceUrl: null, caption: null },
      box,
    );

    expect(result.image.kind).toBe("image");
  });

  it("todas as fontes falham: placeholder com o diagnóstico completo (caso relatado: foto de hotel ausente)", async () => {
    vi.mocked(fetchGooglePlacesPhoto).mockResolvedValue({ ok: false, reason: "GOOGLE_PLACES_API_KEY não configurada" });
    vi.mocked(fetchExternalImage).mockResolvedValue({ ok: false, reason: "HTTP 404" });
    vi.mocked(findAlternativePhoto).mockResolvedValue({
      photo: { status: "not_found", url: null, sourceUrl: null, caption: null },
    });

    const result = await resolveHotelPhoto(
      hotelName,
      location,
      { status: "real_photo_found", url: "https://morta.example.com/hotel.jpg", sourceUrl: null, caption: null },
      box,
    );

    expect(result.image).toEqual({ kind: "placeholder" });
    expect(result.attempts).toEqual([
      { source: "Google Places", reason: "GOOGLE_PLACES_API_KEY não configurada" },
      { source: "URL da IA (https://morta.example.com/hotel.jpg)", reason: "HTTP 404" },
      { source: "Retry da IA", reason: "não encontrou foto alternativa" },
    ]);
  });
});
