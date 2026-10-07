import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/features/pptx/images/fetch-external-image", () => ({ fetchExternalImage: vi.fn() }));
vi.mock("@/features/ai/orchestration/find-alternative-photo", () => ({ findAlternativePhoto: vi.fn() }));

import { fetchExternalImage } from "@/features/pptx/images/fetch-external-image";
import { findAlternativePhoto } from "@/features/ai/orchestration/find-alternative-photo";
import { resolveHotelPhoto } from "@/features/pptx/images/hotel-photo";

const box = { w: 3, h: 2 };
const subject = "o hotel Brasil Express";

describe("resolveHotelPhoto", () => {
  beforeEach(() => {
    vi.mocked(fetchExternalImage).mockReset();
    vi.mocked(findAlternativePhoto).mockReset();
  });

  it("retorna placeholder quando photo é null, sem chamar fetch nem retry", async () => {
    const result = await resolveHotelPhoto(null, box, subject);
    expect(result).toEqual({ kind: "placeholder" });
    expect(fetchExternalImage).not.toHaveBeenCalled();
    expect(findAlternativePhoto).not.toHaveBeenCalled();
  });

  it("retorna placeholder quando status é illustration_required, sem chamar fetch", async () => {
    const result = await resolveHotelPhoto(
      { status: "illustration_required", url: null, sourceUrl: null, caption: "Imagem ilustrativa" },
      box,
      subject,
    );
    expect(result).toEqual({ kind: "placeholder" });
    expect(fetchExternalImage).not.toHaveBeenCalled();
  });

  it("retorna placeholder quando status é not_found, sem chamar fetch", async () => {
    const result = await resolveHotelPhoto(
      { status: "not_found", url: null, sourceUrl: null, caption: null },
      box,
      subject,
    );
    expect(result).toEqual({ kind: "placeholder" });
    expect(fetchExternalImage).not.toHaveBeenCalled();
  });

  it("retorna imagem quando real_photo_found e o fetch original é bem-sucedido, sem retry", async () => {
    vi.mocked(fetchExternalImage).mockResolvedValue({ buffer: await createPngBuffer(), mimeType: "image/png" });
    const result = await resolveHotelPhoto(
      { status: "real_photo_found", url: "https://example.com/hotel.jpg", sourceUrl: null, caption: null },
      box,
      subject,
    );
    expect(result.kind).toBe("image");
    expect(findAlternativePhoto).not.toHaveBeenCalled();
  });

  it("fetch original falha, retry encontra foto alternativa válida: usa a nova foto", async () => {
    vi.mocked(fetchExternalImage)
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({ buffer: await createPngBuffer(), mimeType: "image/png" });
    vi.mocked(findAlternativePhoto).mockResolvedValue({
      photo: {
        status: "real_photo_found",
        url: "https://commons.wikimedia.org/hotel-alternativo.jpg",
        sourceUrl: null,
        caption: null,
      },
    });

    const result = await resolveHotelPhoto(
      { status: "real_photo_found", url: "https://morta.example.com/hotel.jpg", sourceUrl: null, caption: null },
      box,
      subject,
    );

    expect(findAlternativePhoto).toHaveBeenCalledWith({
      subject,
      failedUrl: "https://morta.example.com/hotel.jpg",
    });
    expect(result.kind).toBe("image");
  });

  it("fetch original falha, retry também falha (not_found): cai em placeholder", async () => {
    vi.mocked(fetchExternalImage).mockResolvedValue(null);
    vi.mocked(findAlternativePhoto).mockResolvedValue({
      photo: { status: "not_found", url: null, sourceUrl: null, caption: null },
    });

    const result = await resolveHotelPhoto(
      { status: "real_photo_found", url: "https://morta.example.com/hotel.jpg", sourceUrl: null, caption: null },
      box,
      subject,
    );

    expect(result).toEqual({ kind: "placeholder" });
  });
});

async function createPngBuffer(): Promise<Buffer> {
  const sharp = (await import("sharp")).default;
  return sharp({ create: { width: 100, height: 60, channels: 3, background: { r: 0, g: 0, b: 0 } } })
    .png()
    .toBuffer();
}
