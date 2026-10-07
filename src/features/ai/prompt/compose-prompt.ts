import "server-only";

import type { QuoteFormValues } from "@/features/quotes/schemas/quote-form.schema";

/**
 * Substitui os placeholders do texto-base versionado (`prompt_versions.content`)
 * por texto derivado do formulário preenchido pelo usuário. Função pura —
 * nenhum I/O, 100% testável sem mocks. O texto-base nunca é interpolado via
 * template string no banco: isso evitaria versionamento e misturaria dados
 * de usuário com o prompt armazenado.
 */

export interface InventoryCounts {
  inclusions: number;
  hotels: number;
  rooms: number;
  legs: number;
}

export interface ComposedPromptInput {
  instructions: string;
  inventoryCounts: InventoryCounts;
}

function formatDate(value: string): string {
  if (!value) return "Não informada";
  const [year, month, day] = value.split("-");
  if (!year || !month || !day) return value;
  return `${day}/${month}/${year}`;
}

function formatHotelsBlock(form: QuoteFormValues): string {
  if (form.hotels.length === 0) return "Nenhum hotel informado.";

  return form.hotels
    .map((hotel, index) => {
      const rooms = hotel.rooms.map((room) => `  - ${room.text}`).join("\n");
      return (
        `OPÇÃO ${index + 1} — ${hotel.name}\n` +
        `Plano alimentar: ${hotel.mealPlan}\n` +
        `Acomodações e valores:\n${rooms || "  (nenhuma informada)"}`
      );
    })
    .join("\n\n");
}

function formatFlightsBlock(form: QuoteFormValues): string {
  if (!form.flights.enabled) {
    return "Não foi solicitado slide de voos; não inventar trechos.";
  }

  const legs = form.flights.legs
    .split(/\r?\n/)
    .map((leg) => leg.trim())
    .filter(Boolean);

  // Sem texto digitado, mas com imagem de comprovante anexada: os trechos
  // vêm exclusivamente de `flightImageExtraction` (ver instrução na seção 6
  // do prompt-base), não há nada para "transcrever" aqui.
  if (legs.length === 0 && form.flightImage) {
    return (
      `SLIDE OBRIGATÓRIO: Voos contemplados no orçamento\n` +
      `Nenhum trecho foi digitado; extraia os trechos e horários da imagem de ` +
      `comprovante anexa a esta mensagem e preencha \`flightImageExtraction.extractedLegs\`.\n` +
      `Franquia de bagagem: ${form.flights.baggage}\n` +
      `Marcação de assento: ${form.flights.seat}\n` +
      `Outros serviços: ${form.flights.services || "Nenhum informado."}\n` +
      `Não inferir conexões, horários ou aeroportos além do que a imagem mostra.`
    );
  }

  return (
    `SLIDE OBRIGATÓRIO: Voos contemplados no orçamento\n` +
    `Trechos (${legs.length}), transcrever integralmente:\n` +
    `${legs.map((leg, index) => `${index + 1}. ${leg}`).join("\n")}\n` +
    `Franquia de bagagem: ${form.flights.baggage}\n` +
    `Marcação de assento: ${form.flights.seat}\n` +
    `Outros serviços: ${form.flights.services || "Nenhum informado."}\n` +
    `Não inferir conexões, horários, aeroportos ou outras franquias.`
  );
}

function formatItineraryBlock(form: QuoteFormValues): string {
  if (!form.itinerary.enabled) {
    return "Não foi solicitado roteiro dia a dia.";
  }

  return (
    `Roteiro dia a dia (${form.itinerary.days.length} dias):\n` +
    form.itinerary.days
      .map((day, index) => `${index + 1}. ${day.label}: ${day.description}`)
      .join("\n")
  );
}

function formatInclusionsList(form: QuoteFormValues): string {
  if (form.inclusions.length === 0) return "Nenhuma inclusão informada.";
  return form.inclusions.map((inclusion, index) => `${index + 1}. ${inclusion.text}`).join("\n");
}

function countLegs(form: QuoteFormValues): number {
  if (!form.flights.enabled) return 0;
  return form.flights.legs
    .split(/\r?\n/)
    .map((leg) => leg.trim())
    .filter(Boolean).length;
}

function countRooms(form: QuoteFormValues): number {
  return form.hotels.reduce((total, hotel) => total + hotel.rooms.length, 0);
}

export function composePromptInput(
  form: QuoteFormValues,
  promptTemplate: string,
): ComposedPromptInput {
  const inventoryCounts: InventoryCounts = {
    inclusions: form.inclusions.length,
    hotels: form.hotels.length,
    rooms: countRooms(form),
    legs: countLegs(form),
  };

  const inventoryCountsText =
    `${inventoryCounts.inclusions} inclusões; ${inventoryCounts.hotels} hotéis; ` +
    `${inventoryCounts.rooms} acomodações; ${inventoryCounts.legs} trechos de voo`;

  const replacements: Record<string, string> = {
    "{{AGENCY}}": form.general.agency,
    "{{CONSULTANT}}": form.general.consultant || "Não informado",
    "{{DESTINATION}}": form.general.destination,
    "{{START_DATE}}": formatDate(form.general.startDate),
    "{{END_DATE}}": formatDate(form.general.endDate),
    "{{TRAVELERS}}": form.general.travelers || "Não informada",
    "{{CURRENCY}}": form.general.currency,
    "{{PRICE_TYPE}}": form.general.priceType,
    "{{OCCUPANCY}}": form.general.occupancy || "Não informada",
    "{{TAGLINE}}": form.cover.tagline || "Não informada",
    "{{INCLUSIONS_LIST}}": formatInclusionsList(form),
    "{{HOTELS_BLOCK}}": formatHotelsBlock(form),
    "{{FLIGHTS_BLOCK}}": formatFlightsBlock(form),
    "{{ITINERARY_BLOCK}}": formatItineraryBlock(form),
    "{{INVENTORY_COUNTS}}": inventoryCountsText,
  };

  const instructions = Object.entries(replacements).reduce(
    (text, [placeholder, value]) => text.split(placeholder).join(value),
    promptTemplate,
  );

  return { instructions, inventoryCounts };
}
