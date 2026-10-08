import { describe, expect, it, vi } from "vitest";

import { estimateCostUsd } from "@/features/ai/pricing/estimate-cost";

const PRICING_ROWS = [
  { model: "gpt-4.1", input_per_million_usd: 2.0, output_per_million_usd: 8.0 },
  { model: "gpt-4.1-mini", input_per_million_usd: 0.4, output_per_million_usd: 1.6 },
];

function mockSupabase() {
  const select = vi.fn().mockResolvedValue({ data: PRICING_ROWS, error: null });
  const from = vi.fn().mockReturnValue({ select });
  return { from } as never;
}

describe("estimateCostUsd", () => {
  it("calcula o custo a partir da tabela de preços do modelo", async () => {
    const pricing = PRICING_ROWS[0]!;
    const promptTokens = 1_000_000;
    const completionTokens = 500_000;

    const expected =
      (promptTokens / 1_000_000) * pricing.input_per_million_usd +
      (completionTokens / 1_000_000) * pricing.output_per_million_usd;

    const cost = await estimateCostUsd(mockSupabase(), "gpt-4.1", promptTokens, completionTokens);
    expect(cost).toBeCloseTo(expected, 4);
  });

  it("arredonda para 4 casas decimais", async () => {
    const cost = await estimateCostUsd(mockSupabase(), "gpt-4.1-mini", 1234, 567);
    const decimals = cost.toString().split(".")[1]?.length ?? 0;
    expect(decimals).toBeLessThanOrEqual(4);
  });

  it("retorna 0 para um modelo sem preço cadastrado, sem lançar erro", async () => {
    const cost = await estimateCostUsd(mockSupabase(), "modelo-inexistente", 1000, 1000);
    expect(cost).toBe(0);
  });

  it("retorna 0 quando não há tokens", async () => {
    const cost = await estimateCostUsd(mockSupabase(), "gpt-4.1", 0, 0);
    expect(cost).toBe(0);
  });

  it("reconhece o modelo mesmo com sufixo de versão datada (ex.: retornado pela Responses API)", async () => {
    const supabase = mockSupabase();
    const withSuffix = await estimateCostUsd(supabase, "gpt-4.1-2025-04-14", 1_000_000, 500_000);
    const withoutSuffix = await estimateCostUsd(supabase, "gpt-4.1", 1_000_000, 500_000);
    expect(withSuffix).toBe(withoutSuffix);
    expect(withSuffix).toBeGreaterThan(0);
  });
});
