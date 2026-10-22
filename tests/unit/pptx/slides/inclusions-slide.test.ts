import pptxgen from "pptxgenjs";
import { describe, expect, it } from "vitest";

import { buildInclusionsSlide } from "@/features/pptx/slides/inclusions-slide";
import { DEFAULT_THEME } from "@/features/pptx/theme/extract-theme";
import { getSlides, getSlideTexts } from "./test-helpers";

const baseData = {
  inclusions: [
    { id: "1", text: "Traslado aeroporto/hotel/aeroporto" },
    { id: "2", text: "Café da manhã incluso" },
  ],
  destinationTitle: "Balneário Camboriú",
  destinationDescription: "Onde o mar encontra os arranha-céus.",
  destinationAttractions: ["Praia Central", "Parque Unipraias", "Cristo Luz"],
  agencyLogo: { kind: "placeholder" as const },
  theme: DEFAULT_THEME,
};

describe("buildInclusionsSlide", () => {
  it("adiciona exatamente 1 slide", () => {
    const pres = new pptxgen();
    pres.layout = "LAYOUT_WIDE";
    buildInclusionsSlide(pres, baseData);
    expect(getSlides(pres)).toHaveLength(1);
  });

  it("inclui o título exato da seção", () => {
    const pres = new pptxgen();
    pres.layout = "LAYOUT_WIDE";
    buildInclusionsSlide(pres, baseData);
    expect(getSlideTexts(getSlides(pres)[0]!)).toContain("A experiência inclui os seguintes itens");
  });

  it("inclui o texto de cada inclusão, numerado", () => {
    const pres = new pptxgen();
    pres.layout = "LAYOUT_WIDE";
    buildInclusionsSlide(pres, baseData);
    const texts = getSlideTexts(getSlides(pres)[0]!);
    expect(texts).toContain("Traslado aeroporto/hotel/aeroporto");
    expect(texts).toContain("Café da manhã incluso");
    expect(texts).toContain("01");
    expect(texts).toContain("02");
  });

  it("inclui a descrição e os atrativos do destino", () => {
    const pres = new pptxgen();
    pres.layout = "LAYOUT_WIDE";
    buildInclusionsSlide(pres, baseData);
    const texts = getSlideTexts(getSlides(pres)[0]!);
    expect(texts).toContain("Onde o mar encontra os arranha-céus.");
    expect(texts).toContain("Praia Central");
    expect(texts).toContain("Parque Unipraias");
  });

  it("nunca omite inclusões: com muitas inclusões, pagina em slides de continuação em vez de cortar o bloco 'O destino'", () => {
    const pres = new pptxgen();
    pres.layout = "LAYOUT_WIDE";
    const manyInclusions = Array.from({ length: 5 }, (_, i) => ({ id: String(i), text: `Inclusão ${i + 1}` }));
    buildInclusionsSlide(pres, { ...baseData, inclusions: manyInclusions });

    const slides = getSlides(pres);
    expect(slides.length).toBeGreaterThan(1);

    const allTexts = slides.flatMap((slide) => getSlideTexts(slide));
    for (let i = 1; i <= 5; i += 1) {
      expect(allTexts).toContain(`Inclusão ${i}`);
    }
    expect(allTexts).toContain("Onde o mar encontra os arranha-céus.");
  });

  it("todas as inclusões cabem sozinhas num slide: 'O destino' fica num slide à parte, em vez de dividir as inclusões", () => {
    const pres = new pptxgen();
    pres.layout = "LAYOUT_WIDE";
    const eightInclusions = Array.from({ length: 8 }, (_, i) => ({ id: String(i), text: `Inclusão ${i + 1}` }));
    buildInclusionsSlide(pres, { ...baseData, inclusions: eightInclusions });

    const slides = getSlides(pres);
    expect(slides).toHaveLength(2);

    const firstPageTexts = getSlideTexts(slides[0]!);
    for (let i = 1; i <= 8; i += 1) {
      expect(firstPageTexts).toContain(`Inclusão ${i}`);
    }
    expect(firstPageTexts).not.toContain("Onde o mar encontra os arranha-céus.");

    const lastPageTexts = getSlideTexts(slides[1]!);
    expect(lastPageTexts).toContain("Onde o mar encontra os arranha-céus.");
    for (let i = 1; i <= 8; i += 1) {
      expect(lastPageTexts).not.toContain(`Inclusão ${i}`);
    }
  });

  it("preferência do usuário: com 4 inclusões (cabem num slide só, mas não junto do destino), não divide as inclusões entre 2 slides", () => {
    const pres = new pptxgen();
    pres.layout = "LAYOUT_WIDE";
    const fourInclusions = Array.from({ length: 4 }, (_, i) => ({ id: String(i), text: `Inclusão ${i + 1}` }));
    buildInclusionsSlide(pres, { ...baseData, inclusions: fourInclusions });

    const slides = getSlides(pres);
    expect(slides).toHaveLength(2);

    const firstPageTexts = getSlideTexts(slides[0]!);
    for (let i = 1; i <= 4; i += 1) {
      expect(firstPageTexts).toContain(`Inclusão ${i}`);
    }

    const lastPageTexts = getSlideTexts(slides[1]!);
    expect(lastPageTexts).toContain("Onde o mar encontra os arranha-céus.");
  });

  it("bug relatado: com 7 inclusões, nenhuma aparece duplicada entre slides", () => {
    const pres = new pptxgen();
    pres.layout = "LAYOUT_WIDE";
    const sevenInclusions = Array.from({ length: 7 }, (_, i) => ({ id: String(i), text: `Inclusão ${i + 1}` }));
    buildInclusionsSlide(pres, { ...baseData, inclusions: sevenInclusions });

    const slides = getSlides(pres);
    expect(slides).toHaveLength(2);

    const allTexts = slides.flatMap((slide) => getSlideTexts(slide));
    for (let i = 1; i <= 7; i += 1) {
      expect(allTexts.filter((text) => text === `Inclusão ${i}`)).toHaveLength(1);
    }

    const lastPageTexts = getSlideTexts(slides[1]!);
    expect(lastPageTexts).toContain("Onde o mar encontra os arranha-céus.");
  });

  it("com poucas inclusões, mantém inclusões e bloco 'O destino' no mesmo slide", () => {
    const pres = new pptxgen();
    pres.layout = "LAYOUT_WIDE";
    buildInclusionsSlide(pres, baseData);

    expect(getSlides(pres)).toHaveLength(1);
    const texts = getSlideTexts(getSlides(pres)[0]!);
    expect(texts).toContain("Onde o mar encontra os arranha-céus.");
  });

  it("limita atrativos visíveis a 6, sem lançar erro com mais itens", () => {
    const pres = new pptxgen();
    pres.layout = "LAYOUT_WIDE";
    const manyAttractions = Array.from({ length: 10 }, (_, i) => `Atrativo ${i + 1}`);
    expect(() =>
      buildInclusionsSlide(pres, { ...baseData, destinationAttractions: manyAttractions }),
    ).not.toThrow();

    const texts = getSlideTexts(getSlides(pres)[0]!);
    expect(texts).toContain("Atrativo 6");
    expect(texts).not.toContain("Atrativo 7");
  });
});
