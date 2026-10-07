import "server-only";

import { createClient } from "@/lib/supabase/server";
import { SupabaseQuoteRepository } from "@/features/quotes/repository/supabase-quote-repository";
import type { QuoteRepository } from "@/features/quotes/repository/types";

export type { QuoteRepository, QuoteListFilters, QuoteListResult } from "@/features/quotes/repository/types";
export { InMemoryQuoteRepository } from "@/features/quotes/repository/in-memory-quote-repository";
export { SupabaseQuoteRepository } from "@/features/quotes/repository/supabase-quote-repository";

/**
 * Repositório de orçamentos com dados reais (Supabase), usado pelas Server
 * Actions em `features/quotes/actions`. Server-only: nunca importar de um
 * Client Component (ver `getQuoteRepository` do M3, removido no M5).
 */
export async function getQuoteRepository(): Promise<QuoteRepository> {
  const supabase = await createClient();
  return new SupabaseQuoteRepository(supabase);
}
