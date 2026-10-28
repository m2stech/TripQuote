import "server-only";

import {
  PORT_FEES_LABELS,
  type CruiseFormValues,
} from "@/features/quotes/schemas/cruise-form.schema";

/**
 * Substitui os placeholders do texto-base versionado (`prompt_versions.content`,
 * linha `product_type = 'cruzeiro'`) por texto derivado do formulário de
 * cruzeiro. Mesmo padrão de `compose-prompt.ts` (terrestre): função pura,
 * sem I/O, texto-base nunca interpolado via template string no banco.
 */

export interface CruiseInventoryCounts {
  itineraryStops: number;
  cabins: number;
  included: number;
  notIncluded: number;
  optional: number;
}

export interface ComposedCruisePromptInput {
  instructions: string;
  inventoryCounts: CruiseInventoryCounts;
}

function formatDate(value: string): string {
  if (!value) return "Não informada";
  const [year, month, day] = value.split("-");
  if (!year || !month || !day) return value;
  return `${day}/${month}/${year}`;
}

function formatItineraryBlock(form: CruiseFormValues): string {
  if (form.itinerary.length === 0) {
    return "Nenhum roteiro digitado; extraia os dias/portos do print do roteiro anexo a esta mensagem.";
  }

  return form.itinerary
    .map(
      (stop, index) =>
        `${index + 1}. ${formatDate(stop.date)} — ${stop.portOrDestination} (${stop.operation})` +
        `${stop.arrival ? `, chegada ${stop.arrival}` : ""}${stop.departure ? `, saída ${stop.departure}` : ""}`,
    )
    .join("\n");
}

function formatCabinsBlock(form: CruiseFormValues): string {
  if (form.fare.cabins.length === 0) return "Nenhuma cabine informada.";

  return form.fare.cabins
    .map((cabin, index) => {
      const occupancy = cabin.occupancy || form.general.occupancy || "Não informada";
      return (
        `CABINE ${index + 1} — ${cabin.category} (${cabin.type})\n` +
        `Ocupação: ${occupancy}\n` +
        `Valor total: ${cabin.price}`
      );
    })
    .join("\n\n");
}

function formatPortFeesBlock(form: CruiseFormValues): string {
  const label = PORT_FEES_LABELS[form.fare.portFeesOption];
  if (form.fare.portFeesOption === "not_included" && form.fare.portFeesValue) {
    return `${label} (${form.fare.portFeesValue})`;
  }
  return label;
}

function formatInclusionsList(items: string[]): string {
  if (items.length === 0) return "Nenhum item informado.";
  return items.map((item, index) => `${index + 1}. ${item}`).join("\n");
}

export function composeCruisePromptInput(
  form: CruiseFormValues,
  promptTemplate: string,
): ComposedCruisePromptInput {
  const inventoryCounts: CruiseInventoryCounts = {
    itineraryStops: form.itinerary.length,
    cabins: form.fare.cabins.length,
    included: form.inclusions.included.length,
    notIncluded: form.inclusions.notIncluded.length,
    optional: form.inclusions.optional.length,
  };

  const inventoryCountsText =
    `${inventoryCounts.itineraryStops} dias de roteiro; ${inventoryCounts.cabins} cabines; ` +
    `${inventoryCounts.included} itens incluídos; ${inventoryCounts.notIncluded} não incluídos; ` +
    `${inventoryCounts.optional} opcionais`;

  const replacements: Record<string, string> = {
    "{{AGENCY}}": form.general.agency,
    "{{CONSULTANT}}": form.general.consultant || "Não informado",
    "{{CRUISE_LINE}}": form.general.cruiseLine,
    "{{SHIP_NAME}}": form.general.shipName,
    "{{DESTINATION}}": form.general.destination,
    "{{EMBARKATION_PORT}}": form.general.embarkationPort,
    "{{DISEMBARKATION_PORT}}": form.general.disembarkationPort || form.general.embarkationPort,
    "{{EMBARKATION_DATE}}": formatDate(form.general.embarkationDate),
    "{{DISEMBARKATION_DATE}}": formatDate(form.general.disembarkationDate),
    "{{TRIP_PROFILE}}": form.general.tripProfile || "Não informado",
    "{{OCCUPANCY}}": form.general.occupancy,
    "{{CURRENCY}}": form.general.currency,
    "{{TAGLINE}}": form.cover.tagline || "Não informada",
    "{{ITINERARY_BLOCK}}": formatItineraryBlock(form),
    "{{SHIP_HIGHLIGHTS}}": form.ship.highlights || "Não informado.",
    "{{CABINS_BLOCK}}": formatCabinsBlock(form),
    "{{PORT_FEES_BLOCK}}": formatPortFeesBlock(form),
    "{{FARE_RULES}}": form.fare.fareRules || "Não informadas.",
    "{{INCLUDED_LIST}}": formatInclusionsList(form.inclusions.included),
    "{{NOT_INCLUDED_LIST}}": formatInclusionsList(form.inclusions.notIncluded),
    "{{OPTIONAL_LIST}}": formatInclusionsList(form.inclusions.optional),
    "{{IMPORTANT_INFO}}": form.inclusions.importantInfo || "Nenhuma.",
    "{{INVENTORY_COUNTS}}": inventoryCountsText,
  };

  const instructions = Object.entries(replacements).reduce(
    (text, [placeholder, value]) => text.split(placeholder).join(value),
    promptTemplate,
  );

  return { instructions, inventoryCounts };
}
