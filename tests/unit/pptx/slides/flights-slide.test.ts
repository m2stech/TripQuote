import pptxgen from "pptxgenjs";
import { describe, expect, it } from "vitest";

import { buildFlightsSlide } from "@/features/pptx/slides/flights-slide";
import { DEFAULT_THEME } from "@/features/pptx/theme/extract-theme";
import type { StructuredFlightLeg } from "@/features/quotes/schemas/generation-output.schema";
import { getSlides, getSlideTableCount, getSlideTableTexts, getSlideTexts } from "./test-helpers";

function makeLeg(overrides: Partial<StructuredFlightLeg> = {}): StructuredFlightLeg {
  return {
    direction: "outbound",
    airline: "LATAM Airlines",
    flightNumber: "LA 3555",
    originCode: "CNF",
    originCity: "Belo Horizonte",
    destinationCode: "GRU",
    destinationCity: "São Paulo",
    departureTime: "10h20",
    arrivalTime: "11h40",
    duration: "1h20",
    ...overrides,
  };
}

const baseData = {
  legs: [] as StructuredFlightLeg[],
  rawLines: [] as string[],
  baggage: "1 peça de 23 kg por pessoa",
  seat: "Marcação de assento incluso",
  services: "",
  agencyLogo: { kind: "placeholder" as const },
  theme: DEFAULT_THEME,
};

describe("buildFlightsSlide", () => {
  it("sem trechos estruturados, cai na tabela com as linhas cruas digitadas", () => {
    const pres = new pptxgen();
    pres.layout = "LAYOUT_WIDE";
    buildFlightsSlide(pres, { ...baseData, rawLines: ["voo de ida qualquer", "voo de volta qualquer"] });

    expect(getSlides(pres)).toHaveLength(1);
    expect(getSlideTableCount(getSlides(pres)[0]!)).toBe(1);
    const tableTexts = getSlideTableTexts(getSlides(pres)[0]!);
    expect(tableTexts).toContain("Trecho");
    expect(tableTexts).toContain("voo de ida qualquer");
  });

  it("com 1 trecho de ida: 1 slide com o card do trecho (companhia, voo, cidades, horários, duração), sem label de direção (só 1 grupo)", () => {
    const pres = new pptxgen();
    pres.layout = "LAYOUT_WIDE";
    buildFlightsSlide(pres, { ...baseData, legs: [makeLeg()] });

    expect(getSlides(pres)).toHaveLength(1);
    const texts = getSlideTexts(getSlides(pres)[0]!);
    expect(texts).toContain("Voos contemplados no orçamento");
    expect(texts).not.toContain("IDA");
    expect(texts).toContain("LATAM Airlines");
    expect(texts).toContain("LA 3555");
    expect(texts).toContain("CNF  →  GRU");
    expect(texts).toContain("Belo Horizonte  →  São Paulo");
    expect(texts.some((t) => t.includes("10h20") && t.includes("11h40"))).toBe(true);
    expect(texts.some((t) => t.includes("1h20"))).toBe(true);
  });

  it("com ida e volta: ambos no mesmo slide, com labels 'IDA' e 'RETORNO' separando os grupos", () => {
    const pres = new pptxgen();
    pres.layout = "LAYOUT_WIDE";
    buildFlightsSlide(pres, {
      ...baseData,
      legs: [
        makeLeg({ direction: "outbound" }),
        makeLeg({
          direction: "return",
          originCode: "GRU",
          originCity: "São Paulo",
          destinationCode: "CNF",
          destinationCity: "Belo Horizonte",
        }),
      ],
    });

    const slides = getSlides(pres);
    expect(slides).toHaveLength(1);
    const texts = getSlideTexts(slides[0]!);
    expect(texts).toContain("Voos contemplados no orçamento");
    expect(texts).toContain("IDA");
    expect(texts).toContain("RETORNO");
    expect(texts).toContain("CNF  →  GRU");
    expect(texts).toContain("GRU  →  CNF");
  });

  it("usa 'Nenhum informado.' como fallback quando services está vazio", () => {
    const pres = new pptxgen();
    pres.layout = "LAYOUT_WIDE";
    buildFlightsSlide(pres, { ...baseData, legs: [makeLeg()] });
    expect(getSlideTexts(getSlides(pres)[0]!)).toContain("Nenhum informado.");
  });

  it("inclui bagagem e assento informados", () => {
    const pres = new pptxgen();
    pres.layout = "LAYOUT_WIDE";
    buildFlightsSlide(pres, { ...baseData, legs: [makeLeg()] });
    const texts = getSlideTexts(getSlides(pres)[0]!);
    expect(texts).toContain("1 peça de 23 kg por pessoa");
    expect(texts).toContain("Marcação de assento incluso");
  });

  it("com 3 trechos de ida (ex.: voo com 2 conexões), tudo cabe em 1 único slide, sem duplicar trechos", () => {
    const pres = new pptxgen();
    pres.layout = "LAYOUT_WIDE";
    const legs = [
      makeLeg({ flightNumber: "LA 3555", direction: "outbound" }),
      makeLeg({ flightNumber: "TP 082", direction: "outbound" }),
      makeLeg({ flightNumber: "TP 1452", direction: "outbound" }),
    ];
    buildFlightsSlide(pres, { ...baseData, legs });

    const slides = getSlides(pres);
    expect(slides).toHaveLength(1);
    const texts = getSlideTexts(slides[0]!);
    expect(texts).toContain("LA 3555");
    expect(texts).toContain("TP 082");
    expect(texts).toContain("TP 1452");
    expect(texts).toContain("1 peça de 23 kg por pessoa");
    // Nenhum trecho duplicado (bug anterior: paginação repetia o último trecho na continuação).
    expect(texts.filter((t) => t === "TP 1452")).toHaveLength(1);
  });

  it("com muitos trechos de ida e volta combinados, ainda cabe em 1 único slide, sem sobrepor os cards inferiores", () => {
    const pres = new pptxgen();
    pres.layout = "LAYOUT_WIDE";
    const outbound = Array.from({ length: 3 }, (_, i) =>
      makeLeg({ flightNumber: `LA 000${i}`, direction: "outbound" }),
    );
    const inbound = Array.from({ length: 3 }, (_, i) =>
      makeLeg({ flightNumber: `TP 100${i}`, direction: "return" }),
    );
    buildFlightsSlide(pres, { ...baseData, legs: [...outbound, ...inbound] });

    const slides = getSlides(pres);
    expect(slides).toHaveLength(1);
    const texts = getSlideTexts(slides[0]!);
    expect(texts).toContain("IDA");
    expect(texts).toContain("RETORNO");
    expect(texts).toContain("1 peça de 23 kg por pessoa");
    expect(texts.filter((t) => t.includes("TP 1002"))).toHaveLength(1);
  });

  it("com muitos trechos de ida (8+), ainda cabe em 1 único slide, sem sobrepor os cards inferiores", () => {
    const pres = new pptxgen();
    pres.layout = "LAYOUT_WIDE";
    const manyLegs = Array.from({ length: 8 }, (_, i) =>
      makeLeg({ flightNumber: `LA 000${i}`, direction: "outbound" }),
    );
    buildFlightsSlide(pres, { ...baseData, legs: manyLegs });

    const slides = getSlides(pres);
    expect(slides).toHaveLength(1);
    const texts = getSlideTexts(slides[0]!);
    expect(texts).toContain("1 peça de 23 kg por pessoa");
    // Layout compacto (muitos trechos): cada trecho é 1 texto único com todos os dados, não campos separados.
    expect(texts.some((t) => t.includes("LA 0000"))).toBe(true);
    expect(texts.some((t) => t.includes("LA 0007"))).toBe(true);
  });
});
