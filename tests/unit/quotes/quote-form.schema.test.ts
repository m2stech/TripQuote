import { describe, expect, it } from "vitest";

import {
  flightsSchema,
  generalDataSchema,
  hotelSchema,
  hotelsSchema,
  inclusionsSchema,
  itinerarySchema,
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
});

describe("inclusionsSchema", () => {
  it("rejeita lista vazia", () => {
    expect(inclusionsSchema.safeParse([]).success).toBe(false);
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
    rooms: [{ id: "r1", text: "Standard | R$ 10.000,00" }],
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
});

describe("flightsSchema", () => {
  it("aceita quando desativado, sem exigir campos", () => {
    expect(flightsSchema.safeParse({ enabled: false }).success).toBe(true);
  });

  it("exige trechos, bagagem e assento quando ativado", () => {
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
          rooms: [{ id: "r1", text: "Standard | R$ 10.000,00" }],
        },
      ],
    });
    expect(result.success).toBe(true);
  });
});
