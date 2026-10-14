import sharp from "sharp";
import { describe, expect, it } from "vitest";

import { meetsMinimumResolution, resolveContainSizing, sizeImage } from "@/features/pptx/images/resolve-image-sizing";

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

describe("meetsMinimumResolution", () => {
  const box = { w: 4, h: 3 }; // precisa de >= 440x330px a 110 DPI

  it("rejeita imagem abaixo da resolução mínima para a caixa", () => {
    expect(meetsMinimumResolution(200, 150, box)).toBe(false);
  });

  it("aceita imagem na resolução mínima ou acima", () => {
    expect(meetsMinimumResolution(800, 600, box)).toBe(true);
  });
});

describe("sizeImage", () => {
  const box = { w: 4, h: 3 };

  it("rejeita (retorna null) uma imagem de baixa resolução para a caixa, em vez de esticá-la", async () => {
    const buffer = await sharp({ create: { width: 200, height: 100, channels: 3, background: { r: 1, g: 1, b: 1 } } })
      .png()
      .toBuffer();

    const result = await sizeImage({ buffer, mimeType: "image/png" }, box);
    expect(result).toBeNull();
  });

  it("aceita uma imagem com resolução suficiente", async () => {
    const buffer = await sharp({ create: { width: 800, height: 600, channels: 3, background: { r: 1, g: 1, b: 1 } } })
      .png()
      .toBuffer();

    const result = await sizeImage({ buffer, mimeType: "image/png" }, box);
    expect(result?.kind).toBe("image");
  });
});
