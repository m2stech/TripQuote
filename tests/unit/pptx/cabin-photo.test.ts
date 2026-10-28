import { describe, expect, it, vi } from "vitest";

import { resolveCabinPhoto } from "@/features/pptx/images/cabin-photo";

const box = { w: 2, h: 1 };

describe("resolveCabinPhoto", () => {
  it("retorna placeholder quando não há anexo", async () => {
    const supabase = {} as never;
    const result = await resolveCabinPhoto(supabase, null, box);
    expect(result).toEqual({ kind: "placeholder" });
  });

  it("baixa do bucket cruise-photos e resolve sizing quando há anexo", async () => {
    const sharp = (await import("sharp")).default;
    const buffer = await sharp({
      create: { width: 300, height: 150, channels: 3, background: { r: 10, g: 20, b: 30 } },
    })
      .png()
      .toBuffer();
    const blob = new Blob([buffer]);

    const download = vi.fn().mockResolvedValue({ data: blob, error: null });
    const from = vi.fn().mockReturnValue({ download });
    const supabase = { storage: { from } } as never;

    const result = await resolveCabinPhoto(
      supabase,
      { fileName: "cabine.png", storagePath: "quote-1/cabine.png", mimeType: "image/png", sizeBytes: 100 },
      box,
    );

    expect(from).toHaveBeenCalledWith("cruise-photos");
    expect(download).toHaveBeenCalledWith("quote-1/cabine.png");
    expect(result.kind).toBe("image");
  });

  it("retorna placeholder quando o download falha", async () => {
    const download = vi.fn().mockResolvedValue({ data: null, error: { message: "not found" } });
    const from = vi.fn().mockReturnValue({ download });
    const supabase = { storage: { from } } as never;

    const result = await resolveCabinPhoto(
      supabase,
      { fileName: "cabine.png", storagePath: "quote-1/cabine.png", mimeType: "image/png", sizeBytes: 100 },
      box,
    );

    expect(result).toEqual({ kind: "placeholder" });
  });
});
