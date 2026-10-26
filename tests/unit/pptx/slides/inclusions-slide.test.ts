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

  it("sem inclusões, não adiciona nenhum slide", () => {
    const pres = new pptxgen();
    pres.layout = "LAYOUT_WIDE";
    buildInclusionsSlide(pres, { ...baseData, inclusions: [] });
    expect(getSlides(pres)).toHaveLength(0);
  });

  it("pagina em slides de continuação quando não cabe num slide só, sem omitir nem duplicar inclusões", () => {
    const pres = new pptxgen();
    pres.layout = "LAYOUT_WIDE";
    const manyInclusions = Array.from({ length: 16 }, (_, i) => ({ id: String(i), text: `Inclusão ${i + 1}` }));
    buildInclusionsSlide(pres, { ...baseData, inclusions: manyInclusions });

    const slides = getSlides(pres);
    expect(slides.length).toBeGreaterThan(1);

    const allTexts = slides.flatMap((slide) => getSlideTexts(slide));
    for (let i = 1; i <= 16; i += 1) {
      expect(allTexts.filter((text) => text === `Inclusão ${i}`)).toHaveLength(1);
    }
  });
});
