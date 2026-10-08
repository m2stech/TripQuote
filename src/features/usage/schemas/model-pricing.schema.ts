import "server-only";

import { z } from "zod";

/**
 * Espelha a linha de `model_pricing` (M9). Preço por 1M de tokens, em USD,
 * separado em entrada/saída — mesma unidade usada antes em `MODEL_PRICING`
 * hardcoded (`features/ai/pricing/estimate-cost.ts`).
 */
export const modelPricingRowSchema = z.object({
  model: z.string(),
  inputPerMillionUsd: z.number(),
  outputPerMillionUsd: z.number(),
  updatedBy: z.string(),
  updatedAt: z.string(),
});

export type ModelPricingRecord = z.infer<typeof modelPricingRowSchema>;

export const upsertModelPricingInputSchema = z.object({
  model: z.string().trim().min(1, "Informe o identificador do modelo."),
  inputPerMillionUsd: z.number().min(0, "O preço de entrada não pode ser negativo."),
  outputPerMillionUsd: z.number().min(0, "O preço de saída não pode ser negativo."),
});

export type UpsertModelPricingInput = z.infer<typeof upsertModelPricingInputSchema>;
