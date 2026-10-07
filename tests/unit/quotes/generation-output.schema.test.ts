import { describe, expect, it } from "vitest";

import { generationOutputSchema, type GenerationOutput } from "@/features/quotes/schemas/generation-output.schema";

function validOutput(): GenerationOutput {
  return {
    coverTagline: "Uma viagem inesquecível ao Chile",
    destinationDescription: "Santiago combina modernidade e tradição aos pés dos Andes.",
    hotels: [
      {
        name: "Mandarin Oriental, Santiago",
        shortDescription: "Hotel de luxo no coração financeiro da cidade.",
        location: "Las Condes, Santiago",
        category: "5 estrelas",
        tripadvisorRating: "4,5 (1.200 avaliações)",
        photo: {
          status: "real_photo_found",
          url: "https://example.com/hotel.jpg",
          sourceUrl: "https://example.com/hotel",
          caption: null,
        },
      },
    ],
    flightImageExtraction: {
      wasImageProvided: true,
      extractedLegs: [{ description: "GRU -> SCL, 12/03 08:40 - 13:15" }],
      notes: null,
    },
  };
}

describe("generationOutputSchema", () => {
  it("aceita uma resposta válida completa", () => {
    const result = generationOutputSchema.safeParse(validOutput());
    expect(result.success).toBe(true);
  });

  it("aceita flightImageExtraction nulo quando não havia imagem de voo", () => {
    const result = generationOutputSchema.safeParse({
      ...validOutput(),
      flightImageExtraction: null,
    });
    expect(result.success).toBe(true);
  });

  it("aceita foto de hotel com status illustration_required e sem url", () => {
    const output = validOutput();
    output.hotels[0]!.photo = {
      status: "illustration_required",
      url: null,
      sourceUrl: null,
      caption: "Imagem ilustrativa",
    };
    const result = generationOutputSchema.safeParse(output);
    expect(result.success).toBe(true);
  });

  it("rejeita quando falta um campo obrigatório", () => {
    const output = validOutput() as Record<string, unknown>;
    delete output.coverTagline;
    const result = generationOutputSchema.safeParse(output);
    expect(result.success).toBe(false);
  });

  it("rejeita status de foto fora do enum", () => {
    const output = validOutput();
    // @ts-expect-error valor inválido propositalmente
    output.hotels[0]!.photo.status = "ai_generated";
    const result = generationOutputSchema.safeParse(output);
    expect(result.success).toBe(false);
  });

  it("rejeita url de foto inválida", () => {
    const output = validOutput();
    output.hotels[0]!.photo.url = "não é uma url";
    const result = generationOutputSchema.safeParse(output);
    expect(result.success).toBe(false);
  });

  it("rejeita quando hotels não é um array", () => {
    const output = { ...validOutput(), hotels: "nenhum" };
    const result = generationOutputSchema.safeParse(output);
    expect(result.success).toBe(false);
  });
});
