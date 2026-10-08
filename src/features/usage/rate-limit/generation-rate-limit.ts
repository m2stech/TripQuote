import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/lib/supabase/types";

/**
 * Limite básico contra abuso/custo descontrolado (M9, CLAUDE.md "limites
 * básicos... rate limit por usuário na geração"). Conta linhas em
 * `generations` do próprio usuário dentro da janela, sem depender de infra
 * extra (Redis, etc) — suficiente para o volume esperado da operadora.
 */
export const GENERATION_RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000;
export const GENERATION_RATE_LIMIT_MAX_PER_WINDOW = 20;

export class GenerationRateLimitError extends Error {}

/** Lança `GenerationRateLimitError` se o usuário já atingiu o limite na janela atual. */
export async function enforceGenerationRateLimit(
  supabase: SupabaseClient<Database>,
  userId: string,
): Promise<void> {
  const windowStart = new Date(Date.now() - GENERATION_RATE_LIMIT_WINDOW_MS).toISOString();

  const { count, error } = await supabase
    .from("generations")
    .select("id", { count: "exact", head: true })
    .eq("requested_by", userId)
    .gte("created_at", windowStart);
  if (error) {
    throw new Error(`Não foi possível verificar o limite de gerações: ${error.message}`);
  }

  if ((count ?? 0) >= GENERATION_RATE_LIMIT_MAX_PER_WINDOW) {
    throw new GenerationRateLimitError(
      `Limite de ${GENERATION_RATE_LIMIT_MAX_PER_WINDOW} gerações por hora atingido. Tente novamente mais tarde.`,
    );
  }
}
