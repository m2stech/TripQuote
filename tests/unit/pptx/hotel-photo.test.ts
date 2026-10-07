import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/features/pptx/images/fetch-external-image", () => ({ fetchExternalImage: vi.fn() }));

import { fetchExternalImage } from "@/features/pptx/images/fetch-external-image";
import { resolveHotelPhoto } from "@/features/pptx/images/hotel-photo";

const box = { w: 3, h: 2 };

describe("resolveHotelPhoto", () => {
  beforeEach(() => {
    vi.mocked(fetchExternalImage).mockReset();
  });

  it("retorna placeholder quando photo é null", async () => {
    const result = await resolveHotelPhoto(null, box);
    expect(result).toEqual({ kind: "placeholder" });
    expect(fetchExternalImage).not.toHaveBeenCalled();
  });

  it("retorna placeholder quando status é illustration_required, sem chamar fetch", async () => {
    const result = await resolveHotelPhoto(
      { status: "illustration_required", url: null, sourceUrl: null, caption: "Imagem ilustrativa" },
      box,
    );
    expect(result).toEqual({ kind: "placeholder" });
    expect(fetchExternalImage).not.toHaveBeenCalled();
  });

  it("retorna placeholder quando status é not_found, sem chamar fetch", async () => {
    const result = await resolveHotelPhoto(
      { status: "not_found", url: null, sourceUrl: null, caption: null },
      box,
    );
    expect(result).toEqual({ kind: "placeholder" });
    expect(fetchExternalImage).not.toHaveBeenCalled();
  });

  it("retorna placeholder quando real_photo_found mas o fetch falha", async () => {
    vi.mocked(fetchExternalImage).mockResolvedValue(null);
    const result = await resolveHotelPhoto(
      { status: "real_photo_found", url: "https://example.com/hotel.jpg", sourceUrl: null, caption: null },
      box,
    );
    expect(result).toEqual({ kind: "placeholder" });
  });

  it("retorna imagem quando real_photo_found e o fetch é bem-sucedido", async () => {
    vi.mocked(fetchExternalImage).mockResolvedValue({
      buffer: await createPngBuffer(),
      mimeType: "image/png",
    });
    const result = await resolveHotelPhoto(
      { status: "real_photo_found", url: "https://example.com/hotel.jpg", sourceUrl: null, caption: null },
      box,
    );
    expect(result.kind).toBe("image");
  });
});

async function createPngBuffer(): Promise<Buffer> {
  const sharp = (await import("sharp")).default;
  return sharp({ create: { width: 100, height: 60, channels: 3, background: { r: 0, g: 0, b: 0 } } })
    .png()
    .toBuffer();
}
