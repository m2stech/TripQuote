import { z } from "zod";

/**
 * Schema Zod da resposta estruturada da IA (M6). Fronteira que nenhuma
 * resposta do modelo atravessa sem `safeParse` (ver
 * `features/ai/orchestration/generate-quote-content.ts`) — nunca confiamos
 * no JSON cru, mesmo com o parse automático do SDK (`zodTextFormat`/
 * `responses.parse`).
 *
 * Contém só o que a IA interpreta/redige/pesquisa: textos, descrições e URLs
 * de fotos encontradas via busca. Preço, acomodação, moeda e qualquer dado
 * comercial já digitado pelo usuário nunca aparecem aqui — vêm sempre do
 * formulário (`QuoteFormValues`), nunca da IA.
 *
 * Sem `server-only`: é a FORMA dos dados (não o prompt, nem a chave, nem
 * lógica de orquestração), consumida por `quote.schema.ts` e por telas client
 * (ex.: detalhe do orçamento) para exibir o resultado da geração. Vive em
 * `features/quotes`, não em `features/ai` (que é todo server-only), para que
 * importá-lo de um Client Component nunca quebre o build.
 *
 * Todo campo potencialmente ausente usa `.nullable()`, não `.optional()`: o
 * modo `strict: true` do JSON Schema da Responses API exige todos os campos
 * em `required` e `additionalProperties: false` — "opcional" na prática
 * precisa ser "presente, podendo ser null".
 *
 * Campos de URL usam `z.string()` simples, não `z.string().url()`: o
 * conversor para JSON Schema (`zodTextFormat`) gera `format: "uri"`, que a
 * Responses API rejeita em modo `strict` ("'uri' is not a valid format" —
 * confirmado em teste manual contra a API real). A validação de formato de
 * URL de fato comercialmente útil (usada pelo builder PPTX no M7 antes de
 * um fetch) deve ficar no consumidor, não nesta fronteira de parsing.
 */

export const hotelImageStatusSchema = z.enum([
  "real_photo_found",
  "illustration_required",
  "not_found",
]);

export type HotelImageStatus = z.infer<typeof hotelImageStatusSchema>;

export const generatedPhotoSchema = z.object({
  status: hotelImageStatusSchema,
  url: z.string().nullable(),
  sourceUrl: z.string().nullable(),
  caption: z.string().nullable(),
});

export type GeneratedPhoto = z.infer<typeof generatedPhotoSchema>;

export const generatedHotelSchema = z.object({
  name: z.string(),
  shortDescription: z.string(),
  location: z.string(),
  category: z.string(),
  tripadvisorRating: z.string(),
  photo: generatedPhotoSchema,
});

export type GeneratedHotel = z.infer<typeof generatedHotelSchema>;

export const flightDirectionSchema = z.enum(["outbound", "return"]);

export type FlightDirection = z.infer<typeof flightDirectionSchema>;

export const structuredFlightLegSchema = z.object({
  // Agrupamento dos trechos em uma viagem de ida e, se houver, uma de
  // volta — replica a separação em slides distintos do fluxo legado
  // (`Prompt_orcamento_SNOW.html`), que o usuário apontou como mais rica
  // visualmente que a tabela genérica anterior.
  direction: flightDirectionSchema,
  airline: z.string().trim().max(80),
  flightNumber: z.string().trim().max(20),
  originCode: z.string().trim().max(4),
  originCity: z.string().trim().max(80),
  destinationCode: z.string().trim().max(4),
  destinationCity: z.string().trim().max(80),
  departureTime: z.string().trim().max(40),
  arrivalTime: z.string().trim().max(40),
  duration: z.string().trim().max(40),
});

export type StructuredFlightLeg = z.infer<typeof structuredFlightLegSchema>;

/**
 * Estruturação dos trechos de voo pela IA — a partir do texto digitado
 * (`form.flights.legs`) e/ou da imagem de comprovante anexada. Roda sempre
 * que `flights.enabled`, não só quando há imagem: antes, só a extração via
 * imagem passava por aqui, o que deixava o slide de voos do texto digitado
 * limitado a uma tabela genérica (Voo/Saída/Chegada/Origem/Destino) sem
 * companhia aérea, duração ou nome de cidade.
 */
export const flightItinerarySchema = z.object({
  legs: z.array(structuredFlightLegSchema),
  notes: z.string().nullable(),
});

export type FlightItinerary = z.infer<typeof flightItinerarySchema>;

export const generationOutputSchema = z.object({
  coverTagline: z.string(),
  destinationDescription: z.string(),
  destinationAttractions: z.array(z.string()),
  destinationPhoto: generatedPhotoSchema,
  hotels: z.array(generatedHotelSchema),
  flightItinerary: flightItinerarySchema.nullable(),
});

export type GenerationOutput = z.infer<typeof generationOutputSchema>;

/**
 * Resposta estruturada da IA para o produto Cruzeiro (M11) — mesma fronteira
 * e mesmas regras de `generationOutputSchema` (`.nullable()` em vez de
 * `.optional()`, sem `z.string().url()`), para a mesma resposta `strict`
 * da Responses API. Contém só o que a IA pesquisa/redige: dados do navio,
 * descrições, fotos — nunca preço, cabine ou dado comercial (vêm do form).
 */
export const generatedPortSchema = z.object({
  name: z.string(),
  shortDescription: z.string(),
  photo: generatedPhotoSchema,
});

export type GeneratedPort = z.infer<typeof generatedPortSchema>;

export const generatedShipProfileSchema = z.object({
  shipClass: z.string(),
  capacity: z.string(),
  highlights: z.array(z.string()),
});

export type GeneratedShipProfile = z.infer<typeof generatedShipProfileSchema>;

export const cruiseGenerationOutputSchema = z.object({
  coverTagline: z.string(),
  tripSummary: z.string(),
  shipProfile: generatedShipProfileSchema,
  onboardExperience: z.string(),
  ports: z.array(generatedPortSchema),
  shipPhoto: generatedPhotoSchema,
});

export type CruiseGenerationOutput = z.infer<typeof cruiseGenerationOutputSchema>;
