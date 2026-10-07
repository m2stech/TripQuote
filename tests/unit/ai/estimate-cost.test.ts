import { describe, expect, it } from "vitest";

import { estimateCostUsd, MODEL_PRICING } from "@/features/ai/pricing/estimate-cost";

describe("estimateCostUsd", () => {
  it("calcula o custo a partir da tabela de preços do modelo", () => {
    const pricing = MODEL_PRICING["gpt-4.1"]!;
    const promptTokens = 1_000_000;
    const completionTokens = 500_000;

    const expected =
      (promptTokens / 1_000_000) * pricing.inputPerMillion +
      (completionTokens / 1_000_000) * pricing.outputPerMillion;

    expect(estimateCostUsd("gpt-4.1", promptTokens, completionTokens)).toBeCloseTo(expected, 4);
  });

  it("arredonda para 4 casas decimais", () => {
    const cost = estimateCostUsd("gpt-4.1-mini", 1234, 567);
    const decimals = cost.toString().split(".")[1]?.length ?? 0;
    expect(decimals).toBeLessThanOrEqual(4);
  });

  it("retorna 0 para um modelo desconhecido, sem lançar erro", () => {
    expect(estimateCostUsd("modelo-inexistente", 1000, 1000)).toBe(0);
  });

  it("retorna 0 quando não há tokens", () => {
    expect(estimateCostUsd("gpt-4.1", 0, 0)).toBe(0);
  });

  it("reconhece o modelo mesmo com sufixo de versão datada (ex.: retornado pela Responses API)", () => {
    const withSuffix = estimateCostUsd("gpt-4.1-2025-04-14", 1_000_000, 500_000);
    const withoutSuffix = estimateCostUsd("gpt-4.1", 1_000_000, 500_000);
    expect(withSuffix).toBe(withoutSuffix);
    expect(withSuffix).toBeGreaterThan(0);
  });
});
