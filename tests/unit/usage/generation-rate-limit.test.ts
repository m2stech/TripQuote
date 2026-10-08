import { describe, expect, it, vi } from "vitest";

import {
  enforceGenerationRateLimit,
  GenerationRateLimitError,
  GENERATION_RATE_LIMIT_MAX_PER_WINDOW,
} from "@/features/usage/rate-limit/generation-rate-limit";

function mockSupabase(count: number) {
  const gte = vi.fn().mockResolvedValue({ count, error: null });
  const eq = vi.fn().mockReturnValue({ gte });
  const select = vi.fn().mockReturnValue({ eq });
  const from = vi.fn().mockReturnValue({ select });
  return { from, gte, eq, select } as never;
}

describe("enforceGenerationRateLimit", () => {
  it("não lança quando a contagem está abaixo do limite", async () => {
    const supabase = mockSupabase(GENERATION_RATE_LIMIT_MAX_PER_WINDOW - 1);
    await expect(enforceGenerationRateLimit(supabase, "user-1")).resolves.toBeUndefined();
  });

  it("lança GenerationRateLimitError quando a contagem atinge o limite", async () => {
    const supabase = mockSupabase(GENERATION_RATE_LIMIT_MAX_PER_WINDOW);
    await expect(enforceGenerationRateLimit(supabase, "user-1")).rejects.toBeInstanceOf(
      GenerationRateLimitError,
    );
  });

  it("lança erro genérico se a consulta ao banco falhar", async () => {
    const supabase = { from: vi.fn().mockReturnValue({ select: vi.fn().mockReturnValue({ eq: vi.fn().mockReturnValue({ gte: vi.fn().mockResolvedValue({ count: null, error: { message: "falha" } }) }) }) }) } as never;
    await expect(enforceGenerationRateLimit(supabase, "user-1")).rejects.toThrow(
      "Não foi possível verificar o limite de gerações",
    );
  });
});
