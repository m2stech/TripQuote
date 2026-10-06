import type { QuoteFormValues } from "@/features/quotes/schemas/quote-form.schema";
import type { QuoteRecord, QuoteStatus, QuoteSummary } from "@/features/quotes/schemas/quote.schema";

/**
 * Filtros de listagem de orçamentos. `period` filtra pela data de início da
 * viagem (`general.startDate`).
 */
export interface QuoteListFilters {
  search?: string;
  status?: QuoteStatus;
  destination?: string;
  periodStart?: string;
  periodEnd?: string;
}

export interface QuoteListResult {
  items: QuoteSummary[];
  total: number;
}

/**
 * Camada de acesso a orçamentos. A implementação mock (`InMemoryQuoteRepository`)
 * é usada até o M5; a partir dele é substituída por uma implementação baseada
 * em Supabase, mantendo esta mesma interface para que as telas não precisem
 * ser reescritas (ver docs/PLAN.md, M5).
 */
export interface QuoteRepository {
  list(filters?: QuoteListFilters): Promise<QuoteListResult>;
  getById(id: string): Promise<QuoteRecord | null>;
  create(form: QuoteFormValues, createdBy: string): Promise<QuoteRecord>;
  update(id: string, form: QuoteFormValues): Promise<QuoteRecord>;
  duplicate(id: string): Promise<QuoteRecord>;
  remove(id: string): Promise<void>;
  /**
   * Simula o ciclo de geração via IA (`draft` → `processing` → `done`/`error`).
   * No M6, isso será substituído pela orquestração real com a OpenAI.
   */
  regenerate(id: string): Promise<QuoteRecord>;
}
