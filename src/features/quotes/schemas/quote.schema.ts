import { z } from "zod";

import { generationOutputSchema } from "@/features/quotes/schemas/generation-output.schema";
import { normalizeQuoteDraft, quoteDraftSchema } from "@/features/quotes/schemas/quote-form.schema";

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
  form: quoteDraftSchema,
  aiOutput: generationOutputSchema.nullable().optional(),
});

type QuoteRecordParsed = z.infer<typeof quoteRecordSchema>;

/**
 * Registro de orçamento. `form` é sempre normalizado (`normalizeQuoteDraft`)
 * para `QuoteFormValues` completo, mesmo quando o rascunho no banco está
 * parcialmente preenchido — telas como `toQuoteSummary` podem acessar os
 * campos sem checagem extra.
 */
export type QuoteRecord = Omit<QuoteRecordParsed, "form"> & {
  form: ReturnType<typeof normalizeQuoteDraft>;
};

/** Valida e normaliza um registro bruto (ex.: linha do banco) em `QuoteRecord`. */
export function parseQuoteRecord(raw: unknown): QuoteRecord {
  const parsed = quoteRecordSchema.parse(raw);
  return { ...parsed, form: normalizeQuoteDraft(parsed.form) };
}

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
