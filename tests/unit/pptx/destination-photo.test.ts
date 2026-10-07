import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/features/pptx/images/fetch-external-image", () => ({ fetchExternalImage: vi.fn() }));

import { fetchExternalImage } from "@/features/pptx/images/fetch-external-image";
import { resolveDestinationPhoto } from "@/features/pptx/images/destination-photo";

const box = { w: 4, h: 3 };

describe("resolveDestinationPhoto", () => {
  beforeEach(() => {
    vi.mocked(fetchExternalImage).mockReset();
  });

  it("retorna placeholder quando status não é real_photo_found", async () => {
    const result = await resolveDestinationPhoto(
      { status: "not_found", url: null, sourceUrl: null, caption: null },
      box,
    );
    expect(result).toEqual({ kind: "placeholder" });
    expect(fetchExternalImage).not.toHaveBeenCalled();
  });

  it("retorna placeholder quando o fetch falha", async () => {
    vi.mocked(fetchExternalImage).mockResolvedValue(null);
    const result = await resolveDestinationPhoto(
      { status: "real_photo_found", url: "https://example.com/destino.jpg", sourceUrl: null, caption: null },
      box,
    );
    expect(result).toEqual({ kind: "placeholder" });
  });

  it("retorna imagem quando o fetch é bem-sucedido", async () => {
    const sharp = (await import("sharp")).default;
    const buffer = await sharp({
      create: { width: 200, height: 100, channels: 3, background: { r: 10, g: 10, b: 10 } },
    })
      .png()
      .toBuffer();
    vi.mocked(fetchExternalImage).mockResolvedValue({ buffer, mimeType: "image/png" });

    const result = await resolveDestinationPhoto(
      { status: "real_photo_found", url: "https://example.com/destino.jpg", sourceUrl: null, caption: null },
      box,
    );
    expect(result.kind).toBe("image");
  });
});
