import { describe, expect, it } from "vitest";

import { parseQuoteRecord } from "@/features/quotes/schemas/quote.schema";

function baseRawRecord(aiOutput: unknown) {
  return {
    id: "quote-1",
    status: "done",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    createdBy: "user-1",
    form: {
      general: {
        agency: "Primus Turismo",
        destination: "Santiago",
        startDate: "2026-11-23",
        endDate: "2026-11-27",
        currency: "Real brasileiro (R$)",
        priceType: "Por casal",
      },
    },
    aiOutput,
  };
}

const modernAiOutput = {
  coverTagline: "Tag",
  destinationDescription: "Descrição",
  destinationAttractions: [],
  destinationPhoto: { status: "not_found", url: null, sourceUrl: null, caption: null },
  hotels: [],
  flightItinerary: null,
};

describe("parseQuoteRecord", () => {
  it("aceita um registro atual, já com flightItinerary", () => {
    const record = parseQuoteRecord(baseRawRecord(modernAiOutput));
    expect(record.aiOutput?.flightItinerary).toBeNull();
  });

  it("migra um registro legado sem flightItinerary (de antes da M7), preenchendo null", () => {
    const legacyAiOutput: Record<string, unknown> = { ...modernAiOutput };
    delete legacyAiOutput.flightItinerary;
    const raw = baseRawRecord({
      ...legacyAiOutput,
      // Campo antigo, substituído por `flightItinerary` — não deve quebrar o parse.
      flightImageExtraction: { wasImageProvided: false, extractedLegs: [], notes: null },
    });

    const record = parseQuoteRecord(raw);
    expect(record.aiOutput?.flightItinerary).toBeNull();
  });

  it("aiOutput nulo (orçamento ainda não gerado) continua aceito", () => {
    const record = parseQuoteRecord(baseRawRecord(null));
    expect(record.aiOutput).toBeNull();
  });
});
