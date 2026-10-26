import pptxgen from "pptxgenjs";
import { describe, expect, it } from "vitest";

import { buildDestinationSlide } from "@/features/pptx/slides/destination-slide";
import { DEFAULT_THEME } from "@/features/pptx/theme/extract-theme";
import { getSlides, getSlideTexts } from "./test-helpers";

const baseData = {
  destinationTitle: "Balneário Camboriú",
  destinationDescription: "Onde o mar encontra os arranha-céus.",
  destinationAttractions: ["Praia Central", "Parque Unipraias", "Cristo Luz"],
  agencyLogo: { kind: "placeholder" as const },
  theme: DEFAULT_THEME,
};

describe("buildDestinationSlide", () => {
  it("adiciona exatamente 1 slide", () => {
    const pres = new pptxgen();
    pres.layout = "LAYOUT_WIDE";
    buildDestinationSlide(pres, baseData);
    expect(getSlides(pres)).toHaveLength(1);
  });

  it("inclui o título 'O destino'", () => {
    const pres = new pptxgen();
    pres.layout = "LAYOUT_WIDE";
    buildDestinationSlide(pres, baseData);
    expect(getSlideTexts(getSlides(pres)[0]!)).toContain("O destino");
  });

  it("inclui o nome do destino, a descrição e os atrativos", () => {
    const pres = new pptxgen();
    pres.layout = "LAYOUT_WIDE";
    buildDestinationSlide(pres, baseData);
    const texts = getSlideTexts(getSlides(pres)[0]!);
    expect(texts).toContain("Balneário Camboriú");
    expect(texts).toContain("Onde o mar encontra os arranha-céus.");
    expect(texts).toContain("Praia Central");
    expect(texts).toContain("Parque Unipraias");
  });

  it("limita atrativos visíveis a 6, sem lançar erro com mais itens", () => {
    const pres = new pptxgen();
    pres.layout = "LAYOUT_WIDE";
    const manyAttractions = Array.from({ length: 10 }, (_, i) => `Atrativo ${i + 1}`);
    expect(() =>
      buildDestinationSlide(pres, { ...baseData, destinationAttractions: manyAttractions }),
    ).not.toThrow();

    const texts = getSlideTexts(getSlides(pres)[0]!);
    expect(texts).toContain("Atrativo 6");
    expect(texts).not.toContain("Atrativo 7");
  });
});
