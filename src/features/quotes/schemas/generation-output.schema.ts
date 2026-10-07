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

export const extractedFlightLegSchema = z.object({
  description: z.string(),
});

export const flightImageExtractionSchema = z.object({
  wasImageProvided: z.boolean(),
  extractedLegs: z.array(extractedFlightLegSchema),
  notes: z.string().nullable(),
});

export type FlightImageExtraction = z.infer<typeof flightImageExtractionSchema>;

export const generationOutputSchema = z.object({
  coverTagline: z.string(),
  destinationDescription: z.string(),
  destinationPhoto: generatedPhotoSchema,
  hotels: z.array(generatedHotelSchema),
  flightImageExtraction: flightImageExtractionSchema.nullable(),
});

export type GenerationOutput = z.infer<typeof generationOutputSchema>;
