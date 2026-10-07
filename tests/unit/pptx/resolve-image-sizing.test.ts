import sharp from "sharp";
import { describe, expect, it } from "vitest";

import { resolveContainSizing } from "@/features/pptx/images/resolve-image-sizing";

function createImageBuffer(width: number, height: number): Promise<Buffer> {
  return sharp({ create: { width, height, channels: 3, background: { r: 255, g: 0, b: 0 } } })
    .png()
    .toBuffer();
}

describe("resolveContainSizing", () => {
  it("imagem paisagem (mais larga que a caixa) encaixa pela largura", async () => {
    const buffer = await createImageBuffer(1600, 800); // ratio 2:1
    const box = { w: pt(110), h: pt(48) }; // ratio ~2.29:1 (mais larga que a imagem)
    const result = await resolveContainSizing(buffer, box);

    expect(result.w).toBeLessThanOrEqual(box.w);
    expect(result.h).toBeLessThanOrEqual(box.h);
    expect(result.w / result.h).toBeCloseTo(2, 2);
  });

  it("imagem retrato (mais alta que a caixa) encaixa pela altura", async () => {
    const buffer = await createImageBuffer(400, 800); // ratio 0.5:1
    const box = { w: 2, h: 1 };
    const result = await resolveContainSizing(buffer, box);

    expect(result.w).toBeLessThanOrEqual(box.w);
    expect(result.h).toBeLessThanOrEqual(box.h);
    expect(result.w / result.h).toBeCloseTo(0.5, 2);
  });

  it("nunca excede as dimensões da caixa", async () => {
    const buffer = await createImageBuffer(1000, 1000); // quadrada
    const box = { w: 3, h: 1 };
    const result = await resolveContainSizing(buffer, box);

    expect(result.w).toBeLessThanOrEqual(box.w);
    expect(result.h).toBeLessThanOrEqual(box.h);
  });
});

function pt(points: number): number {
  return points / 72;
}
