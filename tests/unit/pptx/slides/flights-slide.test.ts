import pptxgen from "pptxgenjs";
import { describe, expect, it } from "vitest";

import { buildFlightsSlide } from "@/features/pptx/slides/flights-slide";
import { getSlides, getSlideTableCount, getSlideTableTexts, getSlideTexts } from "./test-helpers";

const baseData = {
  legs: "20JUL - CNF (12:00) / SCL (16:00)\n27JUL - SCL (16:00) / CNF (20:00)",
  baggage: "1 peça de 23 kg por pessoa",
  seat: "Marcação de assento incluso",
  services: "",
  agencyLogo: { kind: "placeholder" as const },
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
});
