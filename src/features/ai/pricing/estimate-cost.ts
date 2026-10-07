import "server-only";

/**
 * Custo estimado por geração (CLAUDE.md: "por geração, registrar modelo,
 * tokens, custo estimado"). Tabela de preços por milhão de tokens; modelo
 * desconhecido retorna custo 0 em vez de lançar erro — não deve bloquear a
 * geração por uma tabela de preços desatualizada (ajustável depois via
 * admin, M9).
 */

export interface ModelPricing {
  inputPerMillion: number;
  outputPerMillion: number;
}

export const MODEL_PRICING: Record<string, ModelPricing> = {
  "gpt-4.1": { inputPerMillion: 2.0, outputPerMillion: 8.0 },
  "gpt-4.1-mini": { inputPerMillion: 0.4, outputPerMillion: 1.6 },
  "gpt-4o": { inputPerMillion: 2.5, outputPerMillion: 10.0 },
};

/**
 * A Responses API retorna o modelo com sufixo de versão datada (ex.:
 * "gpt-4.1-2025-04-14"), que não bate literalmente com a tabela de preços
 * acima (confirmado em teste manual contra a API real). Remove o sufixo
 * `-YYYY-MM-DD` antes do lookup.
 */
function stripDateSuffix(model: string): string {
  return model.replace(/-\d{4}-\d{2}-\d{2}$/, "");
}

export function estimateCostUsd(
  model: string,
  promptTokens: number,
  completionTokens: number,
): number {
  const pricing = MODEL_PRICING[stripDateSuffix(model)];
  if (!pricing) return 0;

  const cost =
    (promptTokens / 1_000_000) * pricing.inputPerMillion +
    (completionTokens / 1_000_000) * pricing.outputPerMillion;

  return Math.round(cost * 10_000) / 10_000;
}
