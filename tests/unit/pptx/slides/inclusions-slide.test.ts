import pptxgen from "pptxgenjs";
import { describe, expect, it } from "vitest";

import { buildInclusionsSlide } from "@/features/pptx/slides/inclusions-slide";
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

  it("nunca omite inclusões: 5 inclusões geram 3 linhas de cards (2+2+1)", () => {
    const pres = new pptxgen();
    pres.layout = "LAYOUT_WIDE";
    const manyInclusions = Array.from({ length: 5 }, (_, i) => ({ id: String(i), text: `Inclusão ${i + 1}` }));
    buildInclusionsSlide(pres, { ...baseData, inclusions: manyInclusions });

    const texts = getSlideTexts(getSlides(pres)[0]!);
    for (let i = 1; i <= 5; i += 1) {
      expect(texts).toContain(`Inclusão ${i}`);
    }
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
