import { describe, expect, it } from "vitest";

import { composePromptInput } from "@/features/ai/prompt/compose-prompt";
import { normalizeQuoteDraft, type QuoteDraftValues } from "@/features/quotes/schemas/quote-form.schema";

const PROMPT_TEMPLATE =
  "Agência: {{AGENCY}}\n" +
  "Consultor: {{CONSULTANT}}\n" +
  "Destino: {{DESTINATION}}\n" +
  "Período: {{START_DATE}} a {{END_DATE}}\n" +
  "Base: {{TRAVELERS}}\n" +
  "Moeda: {{CURRENCY}}\n" +
  "Tipo: {{PRICE_TYPE}}\n" +
  "Ocupação: {{OCCUPANCY}}\n" +
  "Circuito: {{CIRCUIT_BLOCK}}\n" +
  "Tagline: {{TAGLINE}}\n" +
  "Inclusões:\n{{INCLUSIONS_LIST}}\n" +
  "Hotéis:\n{{HOTELS_BLOCK}}\n" +
  "Voos:\n{{FLIGHTS_BLOCK}}\n" +
  "Roteiro:\n{{ITINERARY_BLOCK}}\n" +
  "Inventário: {{INVENTORY_COUNTS}}";

function draft(overrides: QuoteDraftValues = {}) {
  return normalizeQuoteDraft({
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
      isCircuit: false,
      packagePriceTotal: "",
    },
    cover: { tagline: "" },
    inclusions: [{ id: "1", text: "Traslado IN/OUT" }],
    hotels: [
      {
        id: "1",
        name: "Mandarin Oriental, Santiago",
        city: "",
        mealPlan: "Café da manhã",
        rooms: [{ id: "1", roomType: "Standard", price: "R$ 10.000,00" }],
      },
    ],
    flights: { enabled: false },
    itinerary: { enabled: false },
    ...overrides,
  });
}

describe("composePromptInput", () => {
  it("substitui todos os placeholders, sem sobrar nenhum {{...}} no resultado", () => {
    const { instructions } = composePromptInput(draft(), PROMPT_TEMPLATE);
    expect(instructions).not.toMatch(/\{\{[A-Z_]+\}\}/);
  });

  it("interpola os dados gerais corretamente", () => {
    const { instructions } = composePromptInput(draft(), PROMPT_TEMPLATE);
    expect(instructions).toContain("Agência: Primus Turismo");
    expect(instructions).toContain("Destino: Santiago");
    expect(instructions).toContain("Período: 12/03/2026 a 19/03/2026");
  });

  it("usa 'Não informada' quando a tagline está vazia", () => {
    const { instructions } = composePromptInput(draft(), PROMPT_TEMPLATE);
    expect(instructions).toContain("Tagline: Não informada");
  });

  it("preserva a tagline quando informada", () => {
    const { instructions } = composePromptInput(
      draft({ cover: { tagline: "Uma viagem inesquecível" } }),
      PROMPT_TEMPLATE,
    );
    expect(instructions).toContain("Tagline: Uma viagem inesquecível");
  });

  it("inventoryCounts bate com o tamanho dos arrays do formulário", () => {
    const { inventoryCounts } = composePromptInput(draft(), PROMPT_TEMPLATE);
    expect(inventoryCounts).toEqual({ inclusions: 1, hotels: 1, rooms: 1, legs: 0 });
  });

  it("voos desabilitados: bloco explica que não foi solicitado, sem inventar trechos", () => {
    const { instructions, inventoryCounts } = composePromptInput(draft(), PROMPT_TEMPLATE);
    expect(instructions).toContain("Não foi solicitado slide de voos");
    expect(inventoryCounts.legs).toBe(0);
  });

  it("voos habilitados: conta os trechos e inclui bagagem/assento", () => {
    const { instructions, inventoryCounts } = composePromptInput(
      draft({
        flights: {
          enabled: true,
          legs: "20JUL - CNF (12:00) / SCL (16:00)\n27JUL - SCL (16:00) / CNF (20:00)",
          baggage: "1 peça de 23 kg por pessoa",
          seat: "Marcação de assento incluso",
          services: "",
        },
      }),
      PROMPT_TEMPLATE,
    );
    expect(inventoryCounts.legs).toBe(2);
    expect(instructions).toContain("Franquia de bagagem: 1 peça de 23 kg por pessoa");
    expect(instructions).toContain("Marcação de assento: Marcação de assento incluso");
  });

  it("voos habilitados, sem texto digitado, com imagem anexada: pede extração da imagem", () => {
    const { instructions, inventoryCounts } = composePromptInput(
      draft({
        flights: {
          enabled: true,
          legs: "",
          baggage: "1 peça de 23 kg por pessoa",
          seat: "Marcação de assento incluso",
          services: "",
        },
        flightImage: {
          fileName: "voo.jpg",
          storagePath: "quote-1/flight_image/voo.jpg",
          mimeType: "image/jpeg",
          sizeBytes: 12345,
        },
      }),
      PROMPT_TEMPLATE,
    );
    expect(instructions).toContain("Nenhum trecho foi digitado; extraia os trechos");
    expect(instructions).toContain("flightItinerary.legs");
    expect(inventoryCounts.legs).toBe(0);
  });

  it("roteiro desabilitado: bloco informa que não foi solicitado", () => {
    const { instructions } = composePromptInput(draft(), PROMPT_TEMPLATE);
    expect(instructions).toContain("Não foi solicitado roteiro dia a dia.");
  });

  it("roteiro habilitado: lista os dias", () => {
    const { instructions } = composePromptInput(
      draft({
        itinerary: {
          enabled: true,
          days: [{ id: "1", label: "Dia 1 — 20/07", description: "Chegada e city tour" }],
        },
      }),
      PROMPT_TEMPLATE,
    );
    expect(instructions).toContain("Dia 1 — 20/07: Chegada e city tour");
  });

  it("lista as inclusões numeradas", () => {
    const { instructions } = composePromptInput(
      draft({
        inclusions: [
          { id: "1", text: "Traslado IN/OUT" },
          { id: "2", text: "City tour" },
        ],
      }),
      PROMPT_TEMPLATE,
    );
    expect(instructions).toContain("1. Traslado IN/OUT");
    expect(instructions).toContain("2. City tour");
  });

  it("nunca inclui valores monetários fora do bloco de hotéis fornecido pelo usuário", () => {
    const { instructions } = composePromptInput(draft(), PROMPT_TEMPLATE);
    expect(instructions).toContain("Standard | R$ 10.000,00");
  });

  it("modo padrão (não circuito): hotéis são OPÇÕES alternativas com preço", () => {
    const { instructions } = composePromptInput(draft(), PROMPT_TEMPLATE);
    expect(instructions).toContain("OPÇÃO 1 — Mandarin Oriental, Santiago");
    expect(instructions).toContain("Acomodações e valores:");
    expect(instructions).toContain("Este orçamento não é um circuito");
  });

  it("modo circuito: hotéis são CIDADEs sequenciais, sem preço individual, com valor único de pacote", () => {
    const { instructions } = composePromptInput(
      draft({
        general: {
          agency: "Primus Turismo",
          consultant: "Maria Silva",
          destination: "Japão",
          startDate: "2026-03-12",
          endDate: "2026-03-19",
          travelers: "2 adultos",
          currency: "USD",
          priceType: "Por família",
          occupancy: "Duplo",
          isCircuit: true,
          packagePriceTotal: "USD 5.000,00",
        },
        hotels: [
          {
            id: "1",
            name: "Shinjuku Washington",
            city: "Tóquio",
            mealPlan: "Café da manhã",
            rooms: [{ id: "1", roomType: "Standard", price: "" }],
          },
          {
            id: "2",
            name: "Osaka Marriott",
            city: "Osaka",
            mealPlan: "Café da manhã",
            rooms: [{ id: "2", roomType: "Standard", price: "" }],
          },
        ],
      }),
      PROMPT_TEMPLATE,
    );

    expect(instructions).toContain("CIDADE 1 — Tóquio — Shinjuku Washington");
    expect(instructions).toContain("CIDADE 2 — Osaka — Osaka Marriott");
    expect(instructions).toContain("sem valor individual");
    expect(instructions).toContain("valor único de pacote de USD 5.000,00");
    expect(instructions).not.toContain("OPÇÃO 1");
  });
});
