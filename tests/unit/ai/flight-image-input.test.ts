import { describe, expect, it, vi } from "vitest";

import { buildFlightImagePart } from "@/features/ai/vision/flight-image-input";

vi.mock("@/features/quotes/attachments/attachment-storage", () => ({
  createSignedAttachmentUrl: vi.fn(),
}));

import { createSignedAttachmentUrl } from "@/features/quotes/attachments/attachment-storage";

const supabase = {} as never;

describe("buildFlightImagePart", () => {
  it("retorna null quando não há imagem de voo, sem chamar o Storage", async () => {
    const result = await buildFlightImagePart(supabase, null);
    expect(result).toBeNull();
    expect(createSignedAttachmentUrl).not.toHaveBeenCalled();
  });

  it("retorna a parte multimodal quando a signed URL é obtida", async () => {
    vi.mocked(createSignedAttachmentUrl).mockResolvedValueOnce("https://signed.example/flight.png");

    const result = await buildFlightImagePart(supabase, {
      fileName: "voo.png",
      storagePath: "quote-1/attachment-1-voo.png",
      mimeType: "image/png",
      sizeBytes: 1024,
    });

    expect(result).toEqual({
      type: "input_image",
      image_url: "https://signed.example/flight.png",
      detail: "auto",
    });
  });

  it("lança erro claro quando a signed URL não pode ser gerada", async () => {
    vi.mocked(createSignedAttachmentUrl).mockResolvedValueOnce(null);

    await expect(
      buildFlightImagePart(supabase, {
        fileName: "voo.png",
        storagePath: "quote-1/attachment-1-voo.png",
        mimeType: "image/png",
        sizeBytes: 1024,
      }),
    ).rejects.toThrow("Não foi possível acessar a imagem de voo enviada.");
  });
});
