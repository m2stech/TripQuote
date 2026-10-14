import pptxgen from "pptxgenjs";
import { describe, expect, it } from "vitest";

import { buildFlightsSlide } from "@/features/pptx/slides/flights-slide";
import { DEFAULT_THEME } from "@/features/pptx/theme/extract-theme";
import { getSlides, getSlideTableCount, getSlideTableTexts, getSlideTexts } from "./test-helpers";

const baseData = {
  legs: "20JUL - CNF (12:00) / SCL (16:00)\n27JUL - SCL (16:00) / CNF (20:00)",
  baggage: "1 peça de 23 kg por pessoa",
  seat: "Marcação de assento incluso",
  services: "",
  agencyLogo: { kind: "placeholder" as const },
  theme: DEFAULT_THEME,
};

describe("buildFlightsSlide", () => {
  it("adiciona exatamente 1 slide com 1 tabela", () => {
    const pres = new pptxgen();
    pres.layout = "LAYOUT_WIDE";
    buildFlightsSlide(pres, baseData);
    expect(getSlides(pres)).toHaveLength(1);
    expect(getSlideTableCount(getSlides(pres)[0]!)).toBe(1);
  });

  it("inclui o título fixo", () => {
    const pres = new pptxgen();
    pres.layout = "LAYOUT_WIDE";
    buildFlightsSlide(pres, baseData);
    expect(getSlideTexts(getSlides(pres)[0]!)).toContain("Voos contemplados no orçamento");
  });

  it("parseia trechos no padrão esperado em colunas Voo/Saída/Chegada/Origem/Destino", () => {
    const pres = new pptxgen();
    pres.layout = "LAYOUT_WIDE";
    buildFlightsSlide(pres, baseData);
    const tableTexts = getSlideTableTexts(getSlides(pres)[0]!);
    expect(tableTexts).toContain("Voo");
    expect(tableTexts).toContain("CNF");
    expect(tableTexts).toContain("SCL");
  });

  it("fallback: texto fora do padrão vira tabela de 1 coluna 'Trecho', sem quebrar", () => {
    const pres = new pptxgen();
    pres.layout = "LAYOUT_WIDE";
    expect(() =>
      buildFlightsSlide(pres, { ...baseData, legs: "voo de ida qualquer\nvoo de volta qualquer" }),
    ).not.toThrow();

    const tableTexts = getSlideTableTexts(getSlides(pres)[0]!);
    expect(tableTexts).toContain("Trecho");
    expect(tableTexts).toContain("voo de ida qualquer");
  });

  it("usa 'Nenhum informado.' como fallback quando services está vazio", () => {
    const pres = new pptxgen();
    pres.layout = "LAYOUT_WIDE";
    buildFlightsSlide(pres, baseData);
    expect(getSlideTexts(getSlides(pres)[0]!)).toContain("Nenhum informado.");
  });

  it("inclui bagagem e assento informados", () => {
    const pres = new pptxgen();
    pres.layout = "LAYOUT_WIDE";
    buildFlightsSlide(pres, baseData);
    const texts = getSlideTexts(getSlides(pres)[0]!);
    expect(texts).toContain("1 peça de 23 kg por pessoa");
    expect(texts).toContain("Marcação de assento incluso");
  });

  it("com muitos trechos, pagina em slides de continuação em vez de sobrepor os cards inferiores", () => {
    const pres = new pptxgen();
    pres.layout = "LAYOUT_WIDE";
    const manyLegs = Array.from(
      { length: 6 },
      (_, i) => `0${i + 1}JAN - CNF (10:0${i}) / GRU (12:0${i})`,
    ).join("\n");
    buildFlightsSlide(pres, { ...baseData, legs: manyLegs });

    const slides = getSlides(pres);
    expect(slides.length).toBeGreaterThan(1);

    // Nenhum slide intermediário (sem cards) deve ultrapassar o limite que
    // cabe com cards; só o último slide tem os cards.
    const lastSlide = slides[slides.length - 1]!;
    const lastTexts = getSlideTexts(lastSlide);
    expect(lastTexts).toContain("1 peça de 23 kg por pessoa");

    for (const slide of slides.slice(0, -1)) {
      expect(getSlideTexts(slide)).not.toContain("1 peça de 23 kg por pessoa");
    }

    const allTableTexts = slides.flatMap((slide) => getSlideTableTexts(slide));
    expect(allTableTexts).toContain("CNF");
    expect(allTableTexts).toContain("GRU");
  });
});
