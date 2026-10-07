import sharp from "sharp";
import { describe, expect, it } from "vitest";

import { COVER_GRADIENT_STOPS, renderGradientOverlay } from "@/features/pptx/images/render-gradient-overlay";

describe("renderGradientOverlay", () => {
  it("gera um PNG válido com as dimensões pedidas", async () => {
    const buffer = await renderGradientOverlay(200, 100, "091B3A", COVER_GRADIENT_STOPS);
    const metadata = await sharp(buffer).metadata();

    expect(metadata.format).toBe("png");
    expect(metadata.width).toBe(200);
    expect(metadata.height).toBe(100);
    expect(metadata.hasAlpha).toBe(true);
  });

  it("topo é mais transparente que a base (gradiente aplicado de fato)", async () => {
    const buffer = await renderGradientOverlay(10, 100, "091B3A", COVER_GRADIENT_STOPS);
    const { data, info } = await sharp(buffer).raw().ensureAlpha().toBuffer({ resolveWithObject: true });

    const channels = info.channels;
    const topAlpha = data[0 * channels + 3]!;
    const bottomAlpha = data[(info.width * (info.height - 1)) * channels + 3]!;

    expect(topAlpha).toBeLessThan(bottomAlpha);
  });

  it("usa a cor correta (navy) nos pixels opacos", async () => {
    const buffer = await renderGradientOverlay(10, 100, "091B3A", COVER_GRADIENT_STOPS);
    const { data, info } = await sharp(buffer).raw().ensureAlpha().toBuffer({ resolveWithObject: true });

    const channels = info.channels;
    const lastRowOffset = (info.width * (info.height - 1)) * channels;
    const r = data[lastRowOffset]!;
    const g = data[lastRowOffset + 1]!;
    const b = data[lastRowOffset + 2]!;

    // Tolerância de poucas unidades: o PNG final é alpha-premultiplied no
    // compositing contra o fundo padrão, então a cor crua pode variar
    // ligeiramente do hex pedido nos pixels quase-opacos.
    expect(r).toBeCloseTo(0x09, -1);
    expect(g).toBeCloseTo(0x1b, -1);
    expect(b).toBeCloseTo(0x3a, -1);
  });
});
