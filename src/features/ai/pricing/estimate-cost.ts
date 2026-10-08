import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import { getModelPricingMap } from "@/features/usage/repository/model-pricing-repository";
import type { Database } from "@/lib/supabase/types";

/**
 * Custo estimado por geração (CLAUDE.md: "por geração, registrar modelo,
 * tokens, custo estimado"). Preços por milhão de tokens vêm da tabela
 * `model_pricing` (M9), editável pelo admin sem deploy; modelo sem linha
 * cadastrada retorna custo 0 em vez de lançar erro — não deve bloquear a
 * geração por uma tabela de preços desatualizada.
 */

/**
 * A Responses API retorna o modelo com sufixo de versão datada (ex.:
 * "gpt-4.1-2025-04-14"), que não bate literalmente com a tabela de preços
 * (confirmado em teste manual contra a API real). Remove o sufixo
 * `-YYYY-MM-DD` antes do lookup.
 */
function stripDateSuffix(model: string): string {
  return model.replace(/-\d{4}-\d{2}-\d{2}$/, "");
}

export async function estimateCostUsd(
  supabase: SupabaseClient<Database>,
  model: string,
  promptTokens: number,
  completionTokens: number,
): Promise<number> {
  const pricingMap = await getModelPricingMap(supabase);
  const pricing = pricingMap.get(stripDateSuffix(model));
  if (!pricing) return 0;

  const cost =
    (promptTokens / 1_000_000) * pricing.inputPerMillion +
    (completionTokens / 1_000_000) * pricing.outputPerMillion;

  return Math.round(cost * 10_000) / 10_000;
}
