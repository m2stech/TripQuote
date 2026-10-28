import { describe, expect, it } from "vitest";

import { composeCruisePromptInput } from "@/features/ai/prompt/compose-cruise-prompt";
import {
  normalizeCruiseDraft,
  type CruiseDraftInput,
  type CruiseDraftValues,
} from "@/features/quotes/schemas/cruise-form.schema";

const PROMPT_TEMPLATE =
  "Agência: {{AGENCY}}\n" +
  "Consultor: {{CONSULTANT}}\n" +
  "Companhia: {{CRUISE_LINE}}\n" +
  "Navio: {{SHIP_NAME}}\n" +
  "Destino: {{DESTINATION}}\n" +
  "Embarque: {{EMBARKATION_PORT}} em {{EMBARKATION_DATE}}\n" +
  "Desembarque: {{DISEMBARKATION_PORT}} em {{DISEMBARKATION_DATE}}\n" +
  "Perfil: {{TRIP_PROFILE}}\n" +
  "Ocupação: {{OCCUPANCY}}\n" +
  "Moeda: {{CURRENCY}}\n" +
  "Tagline: {{TAGLINE}}\n" +
  "Roteiro:\n{{ITINERARY_BLOCK}}\n" +
  "Destaques do navio: {{SHIP_HIGHLIGHTS}}\n" +
  "Cabines:\n{{CABINS_BLOCK}}\n" +
  "Taxas: {{PORT_FEES_BLOCK}}\n" +
  "Regras: {{FARE_RULES}}\n" +
  "Incluído:\n{{INCLUDED_LIST}}\n" +
  "Não incluído:\n{{NOT_INCLUDED_LIST}}\n" +
  "Opcionais:\n{{OPTIONAL_LIST}}\n" +
  "Informações importantes: {{IMPORTANT_INFO}}\n" +
  "Inventário: {{INVENTORY_COUNTS}}";

function draft(overrides: Omit<CruiseDraftInput, "productType"> = {}) {
  return normalizeCruiseDraft({
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
    ],
    ship: { photos: [], highlights: "" },
    fare: {
      cabins: [{ id: "1", category: "Varanda", type: "Garantida (GTY)", occupancy: "", price: "R$ 4.500,00" }],
      portFeesOption: "included",
      portFeesValue: "",
      fareRules: "",
    },
    paymentTerms: "general",
    inclusions: { included: ["Pensão completa"], notIncluded: ["Bebidas alcoólicas"], optional: ["Wi-Fi"], importantInfo: "" },
    ...overrides,
    productType: "cruzeiro",
  } as CruiseDraftValues);
}

describe("composeCruisePromptInput", () => {
  it("substitui todos os placeholders, sem sobrar nenhum {{...}} no resultado", () => {
    const { instructions } = composeCruisePromptInput(draft(), PROMPT_TEMPLATE);
    expect(instructions).not.toMatch(/\{\{[A-Z_]+\}\}/);
  });

  it("interpola os dados gerais corretamente", () => {
    const { instructions } = composeCruisePromptInput(draft(), PROMPT_TEMPLATE);
    expect(instructions).toContain("Companhia: MSC Cruzeiros");
    expect(instructions).toContain("Navio: MSC Seaside");
    expect(instructions).toContain("Embarque: Santos em 10/12/2026");
  });

  it("usa 'Não informada' quando a tagline está vazia", () => {
    const { instructions } = composeCruisePromptInput(draft(), PROMPT_TEMPLATE);
    expect(instructions).toContain("Tagline: Não informada");
  });

  it("inventoryCounts bate com o tamanho dos arrays do formulário", () => {
    const { inventoryCounts } = composeCruisePromptInput(draft(), PROMPT_TEMPLATE);
    expect(inventoryCounts).toEqual({ itineraryStops: 1, cabins: 1, included: 1, notIncluded: 1, optional: 1 });
  });

  it("sem roteiro digitado, instrui a extrair do print anexado", () => {
    const { instructions } = composeCruisePromptInput(draft({ itinerary: [] }), PROMPT_TEMPLATE);
    expect(instructions).toContain("extraia os dias/portos do print do roteiro anexo");
  });

  it("taxas portuárias não incluídas mostram o valor informado", () => {
    const { instructions } = composeCruisePromptInput(
      draft({
        fare: {
          cabins: [{ id: "1", category: "Varanda", type: "Garantida (GTY)", occupancy: "", price: "R$ 4.500,00", photo: null }],
          portFeesOption: "not_included",
          portFeesValue: "US$ 120 por pessoa",
          fareRules: "",
        },
      }),
      PROMPT_TEMPLATE,
    );
    expect(instructions).toContain("Taxas: Não incluídas (US$ 120 por pessoa)");
  });
});
