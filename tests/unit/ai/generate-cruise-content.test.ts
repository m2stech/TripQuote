import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/features/ai/client/openai-client", () => ({
  getOpenAiClient: vi.fn(),
}));

import { getOpenAiClient } from "@/features/ai/client/openai-client";
import { generateCruiseContent } from "@/features/ai/orchestration/generate-cruise-content";
import { AiGenerationError } from "@/features/ai/orchestration/errors";
import { normalizeCruiseDraft } from "@/features/quotes/schemas/cruise-form.schema";
import type { PromptVersionRecord } from "@/features/prompts/schemas/prompt-version.schema";

const form = normalizeCruiseDraft({
  productType: "cruzeiro",
  general: {
    agency: "Primus Turismo",
    consultant: "Maria Silva",
    cruiseLine: "MSC Cruzeiros",
    shipName: "MSC Seaside",
    destination: "Costa brasileira",
    embarkationPort: "Santos",
    disembarkationPort: "Santos",
    embarkationDate: "2026-12-10",
    disembarkationDate: "2026-12-17",
    tripProfile: "Famílias",
    occupancy: "2 adultos",
    currency: "Real brasileiro (R$)",
  },
  cover: { tagline: "" },
  itinerary: [
    { id: "1", date: "2026-12-10", portOrDestination: "Santos", operation: "Embarque", arrival: "", departure: "18:00" },
    { id: "2", date: "2026-12-11", portOrDestination: "Navegação", operation: "Navegação", arrival: "", departure: "" },
  ],
  ship: { photos: [], highlights: "" },
  fare: {
    cabins: [{ id: "1", category: "Varanda", type: "Garantida (GTY)", occupancy: "", price: "R$ 4.500,00", photo: null }],
    portFeesOption: "included",
    portFeesValue: "",
    fareRules: "",
  },
  paymentTerms: "general",
  inclusions: { included: [], notIncluded: [], optional: [], importantInfo: "" },
});

const promptVersion: PromptVersionRecord = {
  id: "prompt-cruise-1",
  productType: "cruzeiro",
  version: 1,
  content: "Navio: {{SHIP_NAME}}\n{{ITINERARY_BLOCK}}",
  isActive: true,
  createdBy: "admin-1",
  createdAt: new Date().toISOString(),
};

function validOutputParsed() {
  return {
    coverTagline: "Um mergulho na costa brasileira.",
    tripSummary: "Sete dias a bordo do MSC Seaside, saindo de Santos.",
    shipProfile: { shipClass: "Seaside", capacity: "Cerca de 4.200 passageiros", highlights: ["Deck aquático"] },
    onboardExperience: "Entretenimento, gastronomia variada e espaço infantil.",
    ports: [{ name: "Santos", shortDescription: "Porto de embarque.", photo: { status: "not_found", url: null, sourceUrl: null, caption: null } }],
    shipPhoto: { status: "not_found", url: null, sourceUrl: null, caption: null },
  };
}

function mockResponsesParse(...results: Array<{ output_parsed: unknown }>) {
  const parse = vi.fn();
  results.forEach((result) => {
    parse.mockResolvedValueOnce({
      model: "gpt-4.1",
      usage: { input_tokens: 120, output_tokens: 60 },
      ...result,
    });
  });
  vi.mocked(getOpenAiClient).mockReturnValue({
    responses: { parse },
  } as never);
  return parse;
}

describe("generateCruiseContent", () => {
  beforeEach(() => {
    vi.mocked(getOpenAiClient).mockReset();
  });

  it("retorna o resultado validado sem retry quando a primeira resposta é válida", async () => {
    const parse = mockResponsesParse({ output_parsed: validOutputParsed() });

    const result = await generateCruiseContent({ form, promptVersion, itineraryImagePart: null });

    expect(parse).toHaveBeenCalledTimes(1);
    expect(result.model).toBe("gpt-4.1");
    expect(result.promptTokens).toBe(120);
    expect(result.completionTokens).toBe(60);
    expect(result.output.ports).toHaveLength(1);
  });

  it("tenta novamente quando a primeira resposta vem com output_parsed nulo (recusa)", async () => {
    const parse = mockResponsesParse(
      { output_parsed: null },
      { output_parsed: validOutputParsed() },
    );

    const result = await generateCruiseContent({ form, promptVersion, itineraryImagePart: null });

    expect(parse).toHaveBeenCalledTimes(2);
    expect(result.output.coverTagline).toBe("Um mergulho na costa brasileira.");
  });

  it("tenta novamente quando a primeira resposta falha a validação Zod", async () => {
    const invalid = { ...validOutputParsed(), coverTagline: undefined };
    const parse = mockResponsesParse({ output_parsed: invalid }, { output_parsed: validOutputParsed() });

    const result = await generateCruiseContent({ form, promptVersion, itineraryImagePart: null });

    expect(parse).toHaveBeenCalledTimes(2);
    expect(result.output.ports).toHaveLength(1);
  });

  it("lança AiGenerationError quando ambas as tentativas falham", async () => {
    mockResponsesParse({ output_parsed: null }, { output_parsed: null });

    await expect(
      generateCruiseContent({ form, promptVersion, itineraryImagePart: null }),
    ).rejects.toThrow(AiGenerationError);
  });

  it("trata ausência de ports com roteiro informado como falha de validação (retry, depois erro)", async () => {
    const missingPorts = { ...validOutputParsed(), ports: [] };
    mockResponsesParse({ output_parsed: missingPorts }, { output_parsed: missingPorts });

    await expect(
      generateCruiseContent({ form, promptVersion, itineraryImagePart: null }),
    ).rejects.toThrow(AiGenerationError);
  });
});
