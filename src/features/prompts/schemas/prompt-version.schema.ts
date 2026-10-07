import "server-only";

import { z } from "zod";

/**
 * Espelha a linha de `prompt_versions`. `safeParse` aplicado sobre o retorno
 * do Supabase antes de confiar no `content` — mesma fronteira Zod aplicada a
 * qualquer dado externo (CLAUDE.md).
 */
export const promptVersionRowSchema = z.object({
  id: z.string(),
  version: z.number(),
  content: z.string(),
  isActive: z.boolean(),
  createdBy: z.string(),
  createdAt: z.string(),
});

export type PromptVersionRecord = z.infer<typeof promptVersionRowSchema>;
