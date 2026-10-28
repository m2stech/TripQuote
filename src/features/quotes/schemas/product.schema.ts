import { z } from "zod";

import {
  cruiseDraftSchema,
  cruiseFormSchema,
  type CruiseDraftValues,
  type CruiseFormValues,
} from "@/features/quotes/schemas/cruise-form.schema";
import {
  cruiseGenerationOutputSchema,
  generationOutputSchema,
  type CruiseGenerationOutput,
  type GenerationOutput,
} from "@/features/quotes/schemas/generation-output.schema";
import {
  quoteDraftSchema,
  quoteFormSchema,
  type QuoteDraftValues,
  type QuoteFormValues,
} from "@/features/quotes/schemas/quote-form.schema";

/**
 * Union por `productType` dos dois produtos do TripQuote (M11: Cruzeiro ao
 * lado do terrestre). Usada só pelas camadas que de fato lidam com os dois
 * tipos ao mesmo tempo — repository, orquestrador de geração, `quote.schema.ts`
 * — nunca pelo builder PPTX, pelo `compose-prompt` ou pelos componentes de
 * formulário terrestres/de cruzeiro, que continuam tipados no seu próprio
 * schema (`QuoteFormValues`/`CruiseFormValues`) sem saber que a união existe.
 */
export const anyQuoteFormSchema = z.discriminatedUnion("productType", [quoteFormSchema, cruiseFormSchema]);

export type AnyQuoteFormValues = QuoteFormValues | CruiseFormValues;

export const anyQuoteDraftSchema = z.discriminatedUnion("productType", [quoteDraftSchema, cruiseDraftSchema]);

export type AnyQuoteDraftValues = QuoteDraftValues | CruiseDraftValues;

export const anyGenerationOutputSchema = z.union([generationOutputSchema, cruiseGenerationOutputSchema]);

export type AnyGenerationOutput = GenerationOutput | CruiseGenerationOutput;
