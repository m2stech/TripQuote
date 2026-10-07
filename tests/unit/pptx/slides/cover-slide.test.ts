import pptxgen from "pptxgenjs";
import sharp from "sharp";
import { describe, expect, it } from "vitest";

import { buildCoverSlide } from "@/features/pptx/slides/cover-slide";
import type { ResolvedImage } from "@/features/pptx/types";
import { getSlideImageCount, getSlides, getSlideTexts } from "./test-helpers";

async function createPngBuffer(width: number, height: number): Promise<Buffer> {
  return sharp({ create: { width, height, channels: 3, background: { r: 10, g: 20, b: 30 } } })
    .png()
    .toBuffer();
}

const placeholder: ResolvedImage = { kind: "placeholder" };

const baseData = {
  destination: "Balneário Camboriú",
  consultant: "Mauricio Santos",
  tagline: "Onde o mar encontra os arranha-céus.",
  period: "23/11/2026 a 27/11/2026",
  travelers: "2",
  priceInfo: "Por casal, em Real brasileiro (R$)",
  agencyLogo: placeholder,
  destinationPhoto: placeholder,
};

describe("buildCoverSlide", () => {
  it("adiciona exatamente 1 slide", async () => {
    const pres = new pptxgen();
    pres.layout = "LAYOUT_WIDE";
    await buildCoverSlide(pres, baseData);
    expect(getSlides(pres)).toHaveLength(1);
  });

  it("inclui destino, tagline e consultor como texto", async () => {
    const pres = new pptxgen();
    pres.layout = "LAYOUT_WIDE";
    await buildCoverSlide(pres, baseData);

    const texts = getSlideTexts(getSlides(pres)[0]!);
    expect(texts).toContain("Balneário Camboriú");
    expect(texts).toContain("Onde o mar encontra os arranha-céus.");
    expect(texts).toContain("Mauricio Santos");
    expect(texts).toContain("23/11/2026 a 27/11/2026");
  });

  it("sem foto de destino: fundo sólido, sem imagem de overlay de gradiente", async () => {
    const pres = new pptxgen();
    pres.layout = "LAYOUT_WIDE";
    await buildCoverSlide(pres, baseData);

    expect(getSlideImageCount(getSlides(pres)[0]!)).toBe(0);
  });

  it("com foto de destino: adiciona a foto + o overlay de gradiente (2 imagens)", async () => {
    const pres = new pptxgen();
    pres.layout = "LAYOUT_WIDE";
    const destinationPhoto: ResolvedImage = {
      kind: "image",
      data: await createPngBuffer(400, 300),
      sizing: { w: 13.33, h: 7.5 },
    };
    await buildCoverSlide(pres, { ...baseData, destinationPhoto });

    expect(getSlideImageCount(getSlides(pres)[0]!)).toBe(2);
  });

  it("com logo da agência: adiciona mais uma imagem", async () => {
    const pres = new pptxgen();
    pres.layout = "LAYOUT_WIDE";
    const agencyLogo: ResolvedImage = {
      kind: "image",
      data: await createPngBuffer(300, 250),
      sizing: { w: 1, h: 0.9 },
    };
    await buildCoverSlide(pres, { ...baseData, agencyLogo });

    expect(getSlideImageCount(getSlides(pres)[0]!)).toBe(1);
  });
});
