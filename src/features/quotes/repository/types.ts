import type { QuoteDraftValues } from "@/features/quotes/schemas/quote-form.schema";
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
 * Camada de acesso a orçamentos. `InMemoryQuoteRepository` foi a implementação
 * mock usada até o M5 (mantida para testes); `SupabaseQuoteRepository` é a
 * implementação real, usada pelas Server Actions (ver `features/quotes/actions`).
 */
export interface QuoteRepository {
  list(filters?: QuoteListFilters): Promise<QuoteListResult>;
  getById(id: string): Promise<QuoteRecord | null>;
  create(form: QuoteDraftValues, createdBy: string): Promise<QuoteRecord>;
  update(id: string, form: QuoteDraftValues): Promise<QuoteRecord>;
  duplicate(id: string): Promise<QuoteRecord>;
  remove(id: string): Promise<void>;
  /**
   * Simula o ciclo de geração via IA (`draft` → `processing` → `done`/`error`).
   * No M6, isso será substituído pela orquestração real com a OpenAI.
   */
  regenerate(id: string): Promise<QuoteRecord>;
}
