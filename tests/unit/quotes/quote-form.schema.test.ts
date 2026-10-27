import { describe, expect, it } from "vitest";

import {
  flightsSchema,
  generalDataSchema,
  hotelSchema,
  hotelsSchema,
  inclusionsSchema,
  itinerarySchema,
  migrateLegacyRoomOption,
  quoteDraftSchema,
  quoteFormDefaultValues,
  quoteFormSchema,
} from "@/features/quotes/schemas/quote-form.schema";

describe("generalDataSchema", () => {
  const valid = {
    agency: "Primus Turismo",
    consultant: "Maria",
    destination: "Santiago",
    startDate: "2026-07-20",
    endDate: "2026-07-27",
    travelers: "2 adultos + 2 crianças",
    currency: "Real brasileiro (R$)",
    priceType: "Por família" as const,
    occupancy: "Quádruplo",
  };

  it("aceita dados completos e válidos", () => {
    expect(generalDataSchema.safeParse(valid).success).toBe(true);
  });

  it("rejeita quando faltar agência", () => {
    const result = generalDataSchema.safeParse({ ...valid, agency: "" });
    expect(result.success).toBe(false);
  });

  it("rejeita quando faltar destino", () => {
    const result = generalDataSchema.safeParse({ ...valid, destination: "  " });
    expect(result.success).toBe(false);
  });

  it("rejeita tipo de valor fora das opções", () => {
    const result = generalDataSchema.safeParse({ ...valid, priceType: "Outro" });
    expect(result.success).toBe(false);
  });

  it("permite consultor e base de ocupação vazios", () => {
    const result = generalDataSchema.safeParse({
      ...valid,
      consultant: "",
      occupancy: "",
    });
    expect(result.success).toBe(true);
  });

  it("isCircuit padrão é false e não exige packagePriceTotal", () => {
    const result = generalDataSchema.safeParse(valid);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.isCircuit).toBe(false);
    }
  });

  it("com isCircuit=true, exige packagePriceTotal", () => {
    const result = generalDataSchema.safeParse({ ...valid, isCircuit: true });
    expect(result.success).toBe(false);
  });

  it("com isCircuit=true e packagePriceTotal informado, é válido", () => {
    const result = generalDataSchema.safeParse({
      ...valid,
      isCircuit: true,
      packagePriceTotal: "USD 5.000,00",
    });
    expect(result.success).toBe(true);
  });
});

describe("inclusionsSchema", () => {
  it("aceita lista vazia (seção opcional)", () => {
    expect(inclusionsSchema.safeParse([]).success).toBe(true);
  });

  it("aceita ao menos uma inclusão com texto", () => {
    const result = inclusionsSchema.safeParse([{ id: "1", text: "Traslado IN/OUT" }]);
    expect(result.success).toBe(true);
  });

  it("rejeita inclusão com texto vazio", () => {
    const result = inclusionsSchema.safeParse([{ id: "1", text: "" }]);
    expect(result.success).toBe(false);
  });
});

describe("hotelSchema / hotelsSchema", () => {
  const validHotel = {
    id: "1",
    name: "Mandarin Oriental, Santiago",
    mealPlan: "Café da manhã" as const,
    rooms: [{ id: "r1", roomType: "Standard", price: "R$ 10.000,00" }],
  };

  it("aceita hotel válido com ao menos uma acomodação", () => {
    expect(hotelSchema.safeParse(validHotel).success).toBe(true);
  });

  it("rejeita hotel sem acomodações", () => {
    const result = hotelSchema.safeParse({ ...validHotel, rooms: [] });
    expect(result.success).toBe(false);
  });

  it("rejeita hotel sem plano alimentar válido", () => {
    const result = hotelSchema.safeParse({ ...validHotel, mealPlan: "Inexistente" });
    expect(result.success).toBe(false);
  });

  it("rejeita lista de hotéis vazia", () => {
    expect(hotelsSchema.safeParse([]).success).toBe(false);
  });

  it("city é opcional e tem default vazio (modo circuito)", () => {
    const result = hotelSchema.safeParse(validHotel);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.city).toBe("");
    }
  });

  it("aceita city informada", () => {
    const result = hotelSchema.safeParse({ ...validHotel, city: "Osaka" });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.city).toBe("Osaka");
    }
  });

  it("rejeita acomodação sem tipo e sem valor", () => {
    const result = hotelSchema.safeParse({
      ...validHotel,
      rooms: [{ id: "r1", roomType: "", price: "" }],
    });
    expect(result.success).toBe(false);
  });
});

describe("migrateLegacyRoomOption", () => {
  it("migra o formato legado (texto único 'Tipo | Valor') para roomType/price", () => {
    expect(migrateLegacyRoomOption({ id: "r1", text: "Luxo | R$ 8.000,00" })).toEqual({
      id: "r1",
      roomType: "Luxo",
      price: "R$ 8.000,00",
    });
  });

  it("migra o formato legado quando o texto é só um valor monetário (sem separador)", () => {
    expect(migrateLegacyRoomOption({ id: "r1", text: "R$ 34.814,20" })).toEqual({
      id: "r1",
      roomType: "",
      price: "R$ 34.814,20",
    });
  });

  it("migra o formato legado quando o texto é só o tipo (sem separador nem valor)", () => {
    expect(migrateLegacyRoomOption({ id: "r1", text: "Standard" })).toEqual({
      id: "r1",
      roomType: "Standard",
      price: "",
    });
  });

  it("não altera uma acomodação já no formato novo", () => {
    const room = { id: "r1", roomType: "Standard", price: "R$ 10.000,00" };
    expect(migrateLegacyRoomOption(room)).toBe(room);
  });
});

describe("flightsSchema", () => {
  it("aceita quando desativado, sem exigir campos", () => {
    expect(flightsSchema.safeParse({ enabled: false }).success).toBe(true);
  });

  it("exige bagagem e assento quando ativado", () => {
    const result = flightsSchema.safeParse({ enabled: true });
    expect(result.success).toBe(false);
  });

  it("aceita quando ativado e completo", () => {
    const result = flightsSchema.safeParse({
      enabled: true,
      legs: "20JUL - CNF (12:00) / SCL (16:00)",
      baggage: "1 peça de 23 kg por pessoa",
      seat: "Marcação de assento incluso",
      services: "",
    });
    expect(result.success).toBe(true);
  });

  it("rejeita quando uma linha de trecho excede o limite de caracteres", () => {
    const result = flightsSchema.safeParse({
      enabled: true,
      legs: "A".repeat(201),
      baggage: "1 peça de 23 kg por pessoa",
      seat: "Marcação de assento incluso",
      services: "",
    });
    expect(result.success).toBe(false);
  });

  it("aceita quando ativado com trechos vazios (fonte pode ser a imagem anexada)", () => {
    const result = flightsSchema.safeParse({
      enabled: true,
      legs: "",
      baggage: "1 peça de 23 kg por pessoa",
      seat: "Marcação de assento incluso",
      services: "",
    });
    expect(result.success).toBe(true);
  });
});

describe("itinerarySchema", () => {
  it("aceita quando desativado", () => {
    expect(itinerarySchema.safeParse({ enabled: false }).success).toBe(true);
  });

  it("rejeita quando ativado sem dias", () => {
    const result = itinerarySchema.safeParse({ enabled: true, days: [] });
    expect(result.success).toBe(false);
  });

  it("aceita quando ativado com ao menos um dia", () => {
    const result = itinerarySchema.safeParse({
      enabled: true,
      days: [{ id: "1", label: "Dia 1 — 20/07", description: "Chegada e city tour" }],
    });
    expect(result.success).toBe(true);
  });
});

describe("quoteDraftSchema", () => {
  // Regressão: ao marcar "Incluir slide de voos"/"Incluir roteiro detalhado"
  // no formulário, o autosave salva o rascunho imediatamente com os campos
  // ainda vazios (o usuário não teve tempo de preenchê-los). O schema de
  // rascunho não deve exigir `legs`/`days` completos nesse momento — só o
  // schema final (`quoteFormSchema`, na seção "09 Gerar") exige isso.
  it("aceita voos ativados com campos ainda vazios", () => {
    const result = quoteDraftSchema.safeParse({
      flights: { enabled: true, legs: "", baggage: undefined, seat: undefined, services: "" },
    });
    expect(result.success).toBe(true);
  });

  it("aceita roteiro ativado sem dias ou com dias ainda vazios", () => {
    const resultNoDays = quoteDraftSchema.safeParse({
      itinerary: { enabled: true },
    });
    expect(resultNoDays.success).toBe(true);

    const resultEmptyDay = quoteDraftSchema.safeParse({
      itinerary: { enabled: true, days: [{ id: "1", label: "", description: "" }] },
    });
    expect(resultEmptyDay.success).toBe(true);
  });

  it("ainda aceita voos e roteiro desativados", () => {
    const result = quoteDraftSchema.safeParse({
      flights: { enabled: false },
      itinerary: { enabled: false },
    });
    expect(result.success).toBe(true);
  });
});

describe("quoteFormSchema", () => {
  it("rejeita os valores padrão (inclusões e hotéis vazios)", () => {
    expect(quoteFormSchema.safeParse(quoteFormDefaultValues).success).toBe(false);
  });

  it("aceita um formulário completo e válido", () => {
    const result = quoteFormSchema.safeParse({
      ...quoteFormDefaultValues,
      general: {
        agency: "Primus Turismo",
        consultant: "",
        destination: "Santiago",
        startDate: "2026-07-20",
        endDate: "2026-07-27",
        travelers: "",
        currency: "Real brasileiro (R$)",
        priceType: "Por família",
        occupancy: "",
      },
      inclusions: [{ id: "1", text: "Traslado IN/OUT" }],
      hotels: [
        {
          id: "1",
          name: "Mandarin Oriental, Santiago",
          mealPlan: "Café da manhã",
          rooms: [{ id: "r1", roomType: "Standard", price: "R$ 10.000,00" }],
        },
      ],
    });
    expect(result.success).toBe(true);
  });

  it("aceita lista de inclusões vazia (seção opcional)", () => {
    const result = quoteFormSchema.safeParse({
      ...quoteFormDefaultValues,
      general: {
        agency: "Primus Turismo",
        consultant: "",
        destination: "Santiago",
        startDate: "2026-07-20",
        endDate: "2026-07-27",
        travelers: "",
        currency: "Real brasileiro (R$)",
        priceType: "Por família",
        occupancy: "",
      },
      inclusions: [],
      hotels: [
        {
          id: "1",
          name: "Mandarin Oriental, Santiago",
          mealPlan: "Café da manhã",
          rooms: [{ id: "r1", roomType: "Standard", price: "R$ 10.000,00" }],
        },
      ],
    });
    expect(result.success).toBe(true);
  });

  const baseValidForm = {
    ...quoteFormDefaultValues,
    general: {
      agency: "Primus Turismo",
      consultant: "",
      destination: "Santiago",
      startDate: "2026-07-20",
      endDate: "2026-07-27",
      travelers: "",
      currency: "Real brasileiro (R$)",
      priceType: "Por família" as const,
      occupancy: "",
    },
    inclusions: [{ id: "1", text: "Traslado IN/OUT" }],
    hotels: [
      {
        id: "1",
        name: "Mandarin Oriental, Santiago",
        mealPlan: "Café da manhã" as const,
        rooms: [{ id: "r1", roomType: "Standard", price: "R$ 10.000,00" }],
      },
    ],
  };

  it("rejeita voos ativados sem texto digitado e sem imagem anexada", () => {
    const result = quoteFormSchema.safeParse({
      ...baseValidForm,
      flights: {
        enabled: true,
        legs: "",
        baggage: "1 peça de 23 kg por pessoa",
        seat: "Marcação de assento incluso",
        services: "",
      },
      flightImage: null,
    });
    expect(result.success).toBe(false);
  });

  it("aceita voos ativados sem texto digitado quando há imagem anexada", () => {
    const result = quoteFormSchema.safeParse({
      ...baseValidForm,
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
    });
    expect(result.success).toBe(true);
  });
});
