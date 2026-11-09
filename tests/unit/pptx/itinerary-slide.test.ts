import { describe, expect, it } from "vitest";

import {
  countWrappedLines,
  estimateRowHeight,
} from "@/features/pptx/slides/itinerary-slide";

describe("itinerary-slide: estimativa de altura do card", () => {
  it("countWrappedLines soma linhas por parágrafo, não pelo total de caracteres", () => {
    const singleParagraph = "a".repeat(300);
    const threeShortParagraphs = ["Chegada.", "Jantar livre.", "Acomodação no hotel."].join("\n\n");

    const singleLines = countWrappedLines(singleParagraph, 11);
    const paragraphLines = countWrappedLines(threeShortParagraphs, 11);

    // Mesmo volume de texto corrido caberia em poucas linhas; quebrado em
    // parágrafos curtos, cada um ocupa sua própria linha (3 linhas mínimas),
    // mesmo que a soma de caracteres seja bem menor que `singleParagraph`.
    expect(paragraphLines).toBeGreaterThanOrEqual(3);
    expect(singleLines).toBeGreaterThanOrEqual(1);
  });

  it("estimateRowHeight cresce com o número de parágrafos, não só com o total de caracteres", () => {
    const longRunOnText = "Palavra ".repeat(60).trim(); // ~480 chars, 1 parágrafo
    const sameLengthButManyParagraphs = Array.from({ length: 6 }, (_, i) => `Parágrafo ${i + 1} curto.`).join(
      "\n\n",
    );

    const heightRunOn = estimateRowHeight(longRunOnText);
    const heightManyParagraphs = estimateRowHeight(sameLengthButManyParagraphs);

    expect(heightManyParagraphs).toBeGreaterThan(heightRunOn);
  });

  it("reproduz o caso relatado (slide 14): 6 parágrafos curtos exigem card mais alto que a estimativa ingênua por caracteres", () => {
    const description = [
      "Após o café da manhã, saída para um passeio pelos principais atrativos históricos e culturais de Istambul.",
      "Visita panorâmica às Muralhas de Constantinopla e passagem pelo histórico Bairro de Eyüp, às margens do Chifre de Ouro.",
      "Continuação até o Hipódromo Bizantino e a Mesquita Azul. Contemplação externa da Basílica de Santa Sofia e visita ao tradicional Bazar das Especiarias.",
      "Almoço incluído.",
      "Na sequência, visita à Colina de Pierre Loti, com vista panorâmica do Chifre de Ouro.",
      "Retorno ao hotel. Jantar livre e acomodação.",
    ].join("\n\n");

    const naiveLines = Math.ceil(description.length / 76); // fórmula antiga (sem considerar parágrafos)
    const realLines = countWrappedLines(description, 11);

    expect(realLines).toBeGreaterThan(naiveLines);
  });
});
