import { InMemoryQuoteRepository } from "@/features/quotes/repository/in-memory-quote-repository";
import type { QuoteRepository } from "@/features/quotes/repository/types";

export type { QuoteRepository, QuoteListFilters, QuoteListResult } from "@/features/quotes/repository/types";
export { InMemoryQuoteRepository } from "@/features/quotes/repository/in-memory-quote-repository";

/**
 * Instância única do repositório mock, compartilhada entre as telas (M3).
 * A partir do M5, este módulo passa a exportar uma implementação baseada em
 * Supabase, sem exigir mudanças nas telas que consomem `QuoteRepository`.
 */
let repositoryInstance: QuoteRepository | null = null;

export function getQuoteRepository(): QuoteRepository {
  if (!repositoryInstance) {
    repositoryInstance = new InMemoryQuoteRepository();
  }
  return repositoryInstance;
}
