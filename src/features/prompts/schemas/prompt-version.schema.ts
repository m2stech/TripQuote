import "server-only";

import { z } from "zod";

import { productTypeSchema } from "@/features/prompts/schemas/product-type.schema";

export type { ProductType } from "@/features/prompts/schemas/product-type.schema";

/**
 * Espelha a linha de `prompt_versions`. `safeParse` aplicado sobre o retorno
 * do Supabase antes de confiar no `content` — mesma fronteira Zod aplicada a
 * qualquer dado externo (CLAUDE.md).
 */
export const promptVersionRowSchema = z.object({
  id: z.string(),
  productType: productTypeSchema,
  version: z.number(),
  content: z.string(),
  isActive: z.boolean(),
  createdBy: z.string(),
  createdAt: z.string(),
});

export type PromptVersionRecord = z.infer<typeof promptVersionRowSchema>;

export const createPromptVersionInputSchema = z.object({
  productType: productTypeSchema,
  content: z.string().trim().min(1, "O conteúdo do prompt não pode ficar vazio."),
  activate: z.boolean(),
});

export type CreatePromptVersionInput = z.infer<typeof createPromptVersionInputSchema>;
