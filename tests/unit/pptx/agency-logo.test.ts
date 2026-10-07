import { describe, expect, it, vi } from "vitest";

import { resolveAgencyLogo } from "@/features/pptx/images/agency-logo";

const box = { w: 2, h: 1 };

describe("resolveAgencyLogo", () => {
  it("retorna placeholder quando não há anexo", async () => {
    const supabase = {} as never;
    const result = await resolveAgencyLogo(supabase, null, box);
    expect(result).toEqual({ kind: "placeholder" });
  });

  it("baixa e resolve sizing quando há anexo", async () => {
    const sharp = (await import("sharp")).default;
    const buffer = await sharp({
      create: { width: 300, height: 100, channels: 3, background: { r: 0, g: 0, b: 0 } },
    })
      .png()
      .toBuffer();
    const blob = new Blob([buffer]);

    const download = vi.fn().mockResolvedValue({ data: blob, error: null });
    const from = vi.fn().mockReturnValue({ download });
    const supabase = { storage: { from } } as never;

    const result = await resolveAgencyLogo(
      supabase,
      { fileName: "logo.png", storagePath: "quote-1/logo.png", mimeType: "image/png", sizeBytes: 100 },
      box,
    );

    expect(from).toHaveBeenCalledWith("agency-logos");
    expect(result.kind).toBe("image");
  });

  it("retorna placeholder quando o download falha", async () => {
    const download = vi.fn().mockResolvedValue({ data: null, error: { message: "not found" } });
    const from = vi.fn().mockReturnValue({ download });
    const supabase = { storage: { from } } as never;

    const result = await resolveAgencyLogo(
      supabase,
      { fileName: "logo.png", storagePath: "quote-1/logo.png", mimeType: "image/png", sizeBytes: 100 },
      box,
    );

    expect(result).toEqual({ kind: "placeholder" });
  });
});
