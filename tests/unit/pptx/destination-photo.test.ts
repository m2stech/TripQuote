import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/features/pptx/images/fetch-external-image", () => ({ fetchExternalImage: vi.fn() }));
vi.mock("@/features/ai/orchestration/find-alternative-photo", () => ({ findAlternativePhoto: vi.fn() }));

import { fetchExternalImage } from "@/features/pptx/images/fetch-external-image";
import { findAlternativePhoto } from "@/features/ai/orchestration/find-alternative-photo";
import { resolveDestinationPhoto } from "@/features/pptx/images/destination-photo";

const box = { w: 4, h: 3 };
const subject = "o destino Balneário Camboriú";

async function createPngBuffer(): Promise<Buffer> {
  const sharp = (await import("sharp")).default;
  return sharp({ create: { width: 200, height: 100, channels: 3, background: { r: 10, g: 10, b: 10 } } })
    .png()
    .toBuffer();
}

describe("resolveDestinationPhoto", () => {
  beforeEach(() => {
    vi.mocked(fetchExternalImage).mockReset();
    vi.mocked(findAlternativePhoto).mockReset();
  });

  it("retorna placeholder quando status não é real_photo_found, sem chamar fetch nem retry", async () => {
    const result = await resolveDestinationPhoto(
      { status: "not_found", url: null, sourceUrl: null, caption: null },
      box,
      subject,
    );
    expect(result).toEqual({ kind: "placeholder" });
    expect(fetchExternalImage).not.toHaveBeenCalled();
    expect(findAlternativePhoto).not.toHaveBeenCalled();
  });

  it("retorna imagem quando o fetch original é bem-sucedido, sem precisar de retry", async () => {
    vi.mocked(fetchExternalImage).mockResolvedValue({ buffer: await createPngBuffer(), mimeType: "image/png" });

    const result = await resolveDestinationPhoto(
      { status: "real_photo_found", url: "https://example.com/destino.jpg", sourceUrl: null, caption: null },
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
        url: "https://commons.wikimedia.org/alternativa.jpg",
        sourceUrl: null,
        caption: null,
      },
    });

    const result = await resolveDestinationPhoto(
      { status: "real_photo_found", url: "https://morta.example.com/destino.jpg", sourceUrl: null, caption: null },
      box,
      subject,
    );

    expect(findAlternativePhoto).toHaveBeenCalledWith({
      subject,
      failedUrl: "https://morta.example.com/destino.jpg",
    });
    expect(result.kind).toBe("image");
  });

  it("fetch original falha, retry também falha (not_found): cai em placeholder", async () => {
    vi.mocked(fetchExternalImage).mockResolvedValue(null);
    vi.mocked(findAlternativePhoto).mockResolvedValue({
      photo: { status: "not_found", url: null, sourceUrl: null, caption: null },
    });

    const result = await resolveDestinationPhoto(
      { status: "real_photo_found", url: "https://morta.example.com/destino.jpg", sourceUrl: null, caption: null },
      box,
      subject,
    );

    expect(result).toEqual({ kind: "placeholder" });
  });

  it("fetch original falha, retry encontra URL mas o novo fetch também falha: placeholder", async () => {
    vi.mocked(fetchExternalImage).mockResolvedValue(null);
    vi.mocked(findAlternativePhoto).mockResolvedValue({
      photo: {
        status: "real_photo_found",
        url: "https://tambem-morta.example.com/foto.jpg",
        sourceUrl: null,
        caption: null,
      },
    });

    const result = await resolveDestinationPhoto(
      { status: "real_photo_found", url: "https://morta.example.com/destino.jpg", sourceUrl: null, caption: null },
      box,
      subject,
    );

    expect(result).toEqual({ kind: "placeholder" });
  });
});
