import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/features/ai/client/openai-client", () => ({
  getOpenAiClient: vi.fn(),
}));

import { getOpenAiClient } from "@/features/ai/client/openai-client";
import { generateQuoteContent } from "@/features/ai/orchestration/generate-quote-content";
import { AiGenerationError } from "@/features/ai/orchestration/errors";
import { normalizeQuoteDraft } from "@/features/quotes/schemas/quote-form.schema";
import type { PromptVersionRecord } from "@/features/prompts/schemas/prompt-version.schema";

const form = normalizeQuoteDraft({
  general: {
    agency: "Primus Turismo",
    consultant: "Maria Silva",
    destination: "Santiago",
    startDate: "2026-03-12",
    endDate: "2026-03-19",
    travelers: "2 adultos",
    currency: "Real brasileiro (R$)",
    priceType: "Por família",
    occupancy: "Duplo",
  },
  cover: { tagline: "" },
  inclusions: [{ id: "1", text: "Traslado IN/OUT" }],
  hotels: [
    {
      id: "1",
      name: "Mandarin Oriental, Santiago",
      mealPlan: "Café da manhã",
      rooms: [{ id: "1", text: "Standard | R$ 10.000,00" }],
    },
  ],
  flights: { enabled: false },
  itinerary: { enabled: false },
});

const promptVersion: PromptVersionRecord = {
  id: "prompt-1",
  version: 1,
  content: "Destino: {{DESTINATION}}\n{{HOTELS_BLOCK}}",
  isActive: true,
  createdBy: "admin-1",
  createdAt: new Date().toISOString(),
};

function validOutputParsed() {
  return {
    coverTagline: "Uma viagem inesquecível",
    destinationDescription: "Santiago aos pés dos Andes.",
    hotels: [
      {
        name: "Mandarin Oriental, Santiago",
        shortDescription: "Hotel de luxo.",
        location: "Las Condes",
        category: "5 estrelas",
        tripadvisorRating: "Avaliação não verificada",
        photo: { status: "not_found", url: null, sourceUrl: null, caption: null },
      },
    ],
    flightImageExtraction: null,
  };
}

function mockResponsesParse(...results: Array<{ output_parsed: unknown }>) {
  const parse = vi.fn();
  results.forEach((result) => {
    parse.mockResolvedValueOnce({
      model: "gpt-4.1",
      usage: { input_tokens: 100, output_tokens: 50 },
      ...result,
    });
  });
  vi.mocked(getOpenAiClient).mockReturnValue({
    responses: { parse },
  } as never);
  return parse;
}

describe("generateQuoteContent", () => {
  beforeEach(() => {
    vi.mocked(getOpenAiClient).mockReset();
  });

  it("retorna o resultado validado sem retry quando a primeira resposta é válida", async () => {
    const parse = mockResponsesParse({ output_parsed: validOutputParsed() });

    const result = await generateQuoteContent({ form, promptVersion, flightImagePart: null });

    expect(parse).toHaveBeenCalledTimes(1);
    expect(result.model).toBe("gpt-4.1");
    expect(result.promptTokens).toBe(100);
    expect(result.completionTokens).toBe(50);
    expect(result.output.hotels).toHaveLength(1);
  });

  it("tenta novamente quando a primeira resposta vem com output_parsed nulo (recusa)", async () => {
    const parse = mockResponsesParse(
      { output_parsed: null },
      { output_parsed: validOutputParsed() },
    );

    const result = await generateQuoteContent({ form, promptVersion, flightImagePart: null });

    expect(parse).toHaveBeenCalledTimes(2);
    expect(result.output.coverTagline).toBe("Uma viagem inesquecível");
  });

  it("tenta novamente quando a primeira resposta falha a validação Zod", async () => {
    const invalid = { ...validOutputParsed(), coverTagline: undefined };
    const parse = mockResponsesParse({ output_parsed: invalid }, { output_parsed: validOutputParsed() });

    const result = await generateQuoteContent({ form, promptVersion, flightImagePart: null });

    expect(parse).toHaveBeenCalledTimes(2);
    expect(result.output.hotels).toHaveLength(1);
  });

  it("lança AiGenerationError quando ambas as tentativas falham", async () => {
    mockResponsesParse({ output_parsed: null }, { output_parsed: null });

    await expect(
      generateQuoteContent({ form, promptVersion, flightImagePart: null }),
    ).rejects.toThrow(AiGenerationError);
  });

  it("trata contagem de hotéis divergente como falha de validação (retry, depois erro)", async () => {
    const missingHotel = { ...validOutputParsed(), hotels: [] };
    mockResponsesParse({ output_parsed: missingHotel }, { output_parsed: missingHotel });

    await expect(
      generateQuoteContent({ form, promptVersion, flightImagePart: null }),
    ).rejects.toThrow(AiGenerationError);
  });
});
