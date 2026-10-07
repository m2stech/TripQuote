import pptxgen from "pptxgenjs";
import { describe, expect, it } from "vitest";

import { renderInternalHeader } from "@/features/pptx/slides/internal-header";
import type { ResolvedImage } from "@/features/pptx/types";
import { getSlideImageCount, getSlides, getSlideTexts } from "./test-helpers";

describe("renderInternalHeader", () => {
  it("adiciona o título como texto", () => {
    const pres = new pptxgen();
    pres.layout = "LAYOUT_WIDE";
    const slide = pres.addSlide();
    renderInternalHeader(slide, { kind: "placeholder" }, "Escolha o hotel que melhor encaixa no seu perfil!");

    const texts = getSlideTexts(getSlides(pres)[0]!);
    expect(texts).toContain("Escolha o hotel que melhor encaixa no seu perfil!");
  });

  it("sem logo: nenhuma imagem adicionada", () => {
    const pres = new pptxgen();
    pres.layout = "LAYOUT_WIDE";
    const slide = pres.addSlide();
    renderInternalHeader(slide, { kind: "placeholder" }, "Título");

    expect(getSlideImageCount(getSlides(pres)[0]!)).toBe(0);
  });

  it("com logo: adiciona 1 imagem", () => {
    const pres = new pptxgen();
    pres.layout = "LAYOUT_WIDE";
    const slide = pres.addSlide();
    const logo: ResolvedImage = { kind: "image", data: Buffer.from("fake"), sizing: { w: 0.5, h: 0.4 } };
    renderInternalHeader(slide, logo, "Título");

    expect(getSlideImageCount(getSlides(pres)[0]!)).toBe(1);
  });
});
