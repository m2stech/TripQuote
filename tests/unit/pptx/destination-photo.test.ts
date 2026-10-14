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
    vi.mocked(fetchGooglePlacesPhoto).mockResolvedValue({ buffer: await createPngBuffer(), mimeType: "image/jpeg" });

    const result = await resolveDestinationPhoto(destination, aiNotFound, box);

    expect(fetchGooglePlacesPhoto).toHaveBeenCalledWith(`ponto turístico em ${destination}`);
    expect(result.kind).toBe("image");
    expect(fetchWikipediaPhoto).not.toHaveBeenCalled();
    expect(fetchExternalImage).not.toHaveBeenCalled();
    expect(findAlternativePhoto).not.toHaveBeenCalled();
  });

  it("sem Google Places, usa a foto da Wikipedia quando disponível", async () => {
    vi.mocked(fetchGooglePlacesPhoto).mockResolvedValue(null);
    vi.mocked(fetchWikipediaPhoto).mockResolvedValue({ buffer: await createPngBuffer(), mimeType: "image/png" });

    const result = await resolveDestinationPhoto(destination, aiNotFound, box);

    expect(result.kind).toBe("image");
    expect(fetchExternalImage).not.toHaveBeenCalled();
    expect(findAlternativePhoto).not.toHaveBeenCalled();
  });

  it("sem Google Places e sem Wikipedia, usa a URL da IA quando real_photo_found", async () => {
    vi.mocked(fetchGooglePlacesPhoto).mockResolvedValue(null);
    vi.mocked(fetchWikipediaPhoto).mockResolvedValue(null);
    vi.mocked(fetchExternalImage).mockResolvedValue({ buffer: await createPngBuffer(), mimeType: "image/png" });

    const result = await resolveDestinationPhoto(
      destination,
      { status: "real_photo_found", url: "https://example.com/destino.jpg", sourceUrl: null, caption: null },
      box,
    );

    expect(result.kind).toBe("image");
    expect(findAlternativePhoto).not.toHaveBeenCalled();
  });

  it("nenhuma fonte determinística e sem aiPhoto válida: placeholder direto", async () => {
    vi.mocked(fetchGooglePlacesPhoto).mockResolvedValue(null);
    vi.mocked(fetchWikipediaPhoto).mockResolvedValue(null);

    const result = await resolveDestinationPhoto(destination, aiNotFound, box);

    expect(result).toEqual({ kind: "placeholder" });
    expect(fetchExternalImage).not.toHaveBeenCalled();
  });

  it("Places, Wikipedia e URL da IA falham, retry encontra alternativa: usa a nova foto", async () => {
    vi.mocked(fetchGooglePlacesPhoto).mockResolvedValue(null);
    vi.mocked(fetchWikipediaPhoto).mockResolvedValue(null);
    vi.mocked(fetchExternalImage)
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({ buffer: await createPngBuffer(), mimeType: "image/png" });
    vi.mocked(findAlternativePhoto).mockResolvedValue({
      photo: { status: "real_photo_found", url: "https://commons.wikimedia.org/alt.jpg", sourceUrl: null, caption: null },
    });

    const result = await resolveDestinationPhoto(
      destination,
      { status: "real_photo_found", url: "https://morta.example.com/destino.jpg", sourceUrl: null, caption: null },
      box,
    );

    expect(result.kind).toBe("image");
  });

  it("todas as fontes falham: placeholder", async () => {
    vi.mocked(fetchGooglePlacesPhoto).mockResolvedValue(null);
    vi.mocked(fetchWikipediaPhoto).mockResolvedValue(null);
    vi.mocked(fetchExternalImage).mockResolvedValue(null);
    vi.mocked(findAlternativePhoto).mockResolvedValue({ photo: aiNotFound });

    const result = await resolveDestinationPhoto(
      destination,
      { status: "real_photo_found", url: "https://morta.example.com/destino.jpg", sourceUrl: null, caption: null },
      box,
    );

    expect(result).toEqual({ kind: "placeholder" });
  });

  it("foto do Google Places com resolução baixa é rejeitada, cai para Wikipedia", async () => {
    const smallBuffer = await (
      await import("sharp")
    )
      .default({ create: { width: 100, height: 75, channels: 3, background: { r: 1, g: 1, b: 1 } } })
      .png()
      .toBuffer();
    vi.mocked(fetchGooglePlacesPhoto).mockResolvedValue({ buffer: smallBuffer, mimeType: "image/jpeg" });
    vi.mocked(fetchWikipediaPhoto).mockResolvedValue({ buffer: await createPngBuffer(), mimeType: "image/png" });

    const result = await resolveDestinationPhoto(destination, aiNotFound, box);

    expect(result.kind).toBe("image");
    expect(fetchWikipediaPhoto).toHaveBeenCalled();
  });
});
