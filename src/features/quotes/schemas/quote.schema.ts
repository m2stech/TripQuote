import { z } from "zod";

import { quoteFormSchema } from "@/features/quotes/schemas/quote-form.schema";

/**
 * Schemas Zod do registro de orçamento (metadados + payload do formulário).
 * Representa a entidade persistida (mock até o M5, Supabase a partir dele).
 * O status reflete o ciclo de vida da geração via IA (ver CLAUDE.md).
 */

export const quoteStatusValues = ["draft", "processing", "done", "error"] as const;

export const quoteStatusSchema = z.enum(quoteStatusValues);

export type QuoteStatus = z.infer<typeof quoteStatusSchema>;

export const quoteStatusLabels: Record<QuoteStatus, string> = {
  draft: "Rascunho",
  processing: "Processando",
  done: "Concluído",
  error: "Erro",
};

export const quoteRecordSchema = z.object({
  id: z.string(),
  status: quoteStatusSchema,
  createdAt: z.string(),
  updatedAt: z.string(),
  createdBy: z.string(),
  errorMessage: z.string().optional(),
  form: quoteFormSchema,
});

export type QuoteRecord = z.infer<typeof quoteRecordSchema>;

/**
 * Resumo usado em listagens (evita carregar o formulário completo quando não
 * é necessário).
 */
export interface QuoteSummary {
  id: string;
  status: QuoteStatus;
  agency: string;
  consultant: string;
  destination: string;
  startDate: string;
  endDate: string;
  createdAt: string;
  updatedAt: string;
}

export function toQuoteSummary(record: QuoteRecord): QuoteSummary {
  return {
    id: record.id,
    status: record.status,
    agency: record.form.general.agency,
    consultant: record.form.general.consultant || "—",
    destination: record.form.general.destination,
    startDate: record.form.general.startDate,
    endDate: record.form.general.endDate,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
  };
}
