import { z } from "zod";

/**
 * Schemas Zod do formulário de orçamento (TripQuote).
 * Fonte única dos tipos usados pelo formulário, pela persistência (M5) e
 * pela composição do prompt (M6). Mensagens de validação em pt-BR.
 */

const requiredText = (message: string) => z.string().trim().min(1, message);

// 01 — Dados gerais ---------------------------------------------------------

export const priceTypeOptions = [
  "Por família",
  "Por pessoa",
  "Por casal",
  "Valor total do grupo",
] as const;

export const generalDataSchema = z.object({
  agency: requiredText("Informe o nome da agência."),
  consultant: z.string().trim().optional().default(""),
  destination: requiredText("Informe o destino."),
  startDate: requiredText("Informe a data de início da viagem."),
  endDate: requiredText("Informe a data de fim da viagem."),
  travelers: z.string().trim().optional().default(""),
  currency: requiredText("Informe a moeda."),
  priceType: z.enum(priceTypeOptions),
  occupancy: z.string().trim().optional().default(""),
});

export type GeneralData = z.infer<typeof generalDataSchema>;

// 02 — Capa -------------------------------------------------------------

export const coverSchema = z.object({
  tagline: z.string().trim().optional().default(""),
});

export type Cover = z.infer<typeof coverSchema>;

// 03 — Inclusões ---------------------------------------------------------

export const inclusionSchema = z.object({
  id: z.string(),
  text: requiredText("Descreva a inclusão."),
});

export type Inclusion = z.infer<typeof inclusionSchema>;

export const inclusionsSchema = z
  .array(inclusionSchema)
  .min(1, "Adicione ao menos uma inclusão.");

// 04 — Hotéis -------------------------------------------------------------

export const mealPlanOptions = [
  "Sem plano alimentar",
  "Café da manhã",
  "Meia pensão",
  "Pensão completa",
  "All Inclusive",
] as const;

export const roomOptionSchema = z.object({
  id: z.string(),
  text: requiredText("Informe a acomodação e o valor."),
});

export type RoomOption = z.infer<typeof roomOptionSchema>;

export const hotelSchema = z.object({
  id: z.string(),
  name: requiredText("Informe o nome oficial do hotel."),
  mealPlan: z.enum(mealPlanOptions, {
    error: "Selecione o plano alimentar.",
  }),
  rooms: z.array(roomOptionSchema).min(1, "Adicione ao menos uma acomodação."),
});

export type Hotel = z.infer<typeof hotelSchema>;

export const hotelsSchema = z.array(hotelSchema).min(1, "Adicione ao menos um hotel.");

// 05 — Voos e serviços ------------------------------------------------------

export const baggageOptions = [
  "Não inclui despacho de malas",
  "1 peça de 23 kg por pessoa",
  "2 peças de 23kg por pessoa",
] as const;

export const seatOptions = [
  "Marcação de assento cobrado a parte",
  "Marcação de assento incluso",
] as const;

const flightFieldsSchema = z.object({
  legs: requiredText("Informe os trechos e horários do voo."),
  baggage: z.enum(baggageOptions, { error: "Selecione a franquia de bagagem." }),
  seat: z.enum(seatOptions, { error: "Selecione a marcação de assento." }),
  services: z.string().trim().optional().default(""),
});

export const flightsSchema = z.discriminatedUnion("enabled", [
  z.object({ enabled: z.literal(false) }),
  z.object({ enabled: z.literal(true) }).extend(flightFieldsSchema.shape),
]);

export type Flights = z.infer<typeof flightsSchema>;

// 06 — Programação dia a dia -------------------------------------------

export const itineraryDaySchema = z.object({
  id: z.string(),
  label: requiredText("Informe o dia/data."),
  description: requiredText("Informe a programação do dia."),
});

export type ItineraryDay = z.infer<typeof itineraryDaySchema>;

export const itinerarySchema = z.discriminatedUnion("enabled", [
  z.object({ enabled: z.literal(false) }),
  z.object({
    enabled: z.literal(true),
    days: z.array(itineraryDaySchema).min(1, "Adicione ao menos um dia do roteiro."),
  }),
]);

export type Itinerary = z.infer<typeof itinerarySchema>;

// 07 — Pagamento fixo (somente leitura, texto institucional fixo) ---------

export const FIXED_PAYMENT_TERMS =
  "Pagamento à vista: 5% de desconto para pagamento à vista via Dinheiro, PIX ou Depósito Bancário.\n" +
  "Cartão de Crédito: até 10x sem juros, sem entrada.\n" +
  "Boleto Bancário: até 10x sem juros, sendo 25% de entrada + 9 parcelas iguais.\n" +
  "Observação importante: valor mínimo por parcela: R$ 500,00.";

// 08 — Rodapé institucional (somente leitura) -------------------------

export const INSTITUTIONAL_LOGO_URL =
  "https://www.mysnow.com.br/images/upload_p//Logos/Operado%20por%20SNOW.png";

export const FIXED_INSTITUTIONAL_FOOTER =
  "Produto desenvolvido e criado com a qualidade e segurança SNOW Operadora.";

// Formulário completo -----------------------------------------------------

export const quoteFormSchema = z.object({
  general: generalDataSchema,
  cover: coverSchema,
  inclusions: inclusionsSchema,
  hotels: hotelsSchema,
  flights: flightsSchema,
  itinerary: itinerarySchema,
  agencyLogo: z
    .object({
      fileName: z.string(),
      dataUrl: z.string(),
    })
    .nullable()
    .default(null),
  flightImage: z
    .object({
      fileName: z.string(),
      dataUrl: z.string(),
    })
    .nullable()
    .default(null),
});

export type QuoteFormValues = z.infer<typeof quoteFormSchema>;

export const quoteFormDefaultValues: QuoteFormValues = {
  general: {
    agency: "",
    consultant: "",
    destination: "",
    startDate: "",
    endDate: "",
    travelers: "",
    currency: "Real brasileiro (R$)",
    priceType: "Por família",
    occupancy: "",
  },
  cover: { tagline: "" },
  inclusions: [],
  hotels: [],
  flights: { enabled: false },
  itinerary: { enabled: false },
  agencyLogo: null,
  flightImage: null,
};
