import { describe, expect, it } from "vitest";

import { updateCommercialStatusInputSchema } from "@/features/quotes/schemas/commercial-status.schema";

describe("updateCommercialStatusInputSchema", () => {
  it("aceita status 'pending' sem localizador nem justificativa", () => {
    const result = updateCommercialStatusInputSchema.safeParse({ status: "pending" });
    expect(result.success).toBe(true);
  });

  it("exige localizador quando o status é 'won'", () => {
    const result = updateCommercialStatusInputSchema.safeParse({ status: "won" });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.path).toEqual(["reference"]);
    }
  });

  it("aceita 'won' com localizador informado", () => {
    const result = updateCommercialStatusInputSchema.safeParse({
      status: "won",
      reference: "LOC-123",
    });
    expect(result.success).toBe(true);
  });

  it("exige justificativa quando o status é 'lost'", () => {
    const result = updateCommercialStatusInputSchema.safeParse({ status: "lost" });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.path).toEqual(["reason"]);
    }
  });

  it("aceita 'lost' com justificativa informada", () => {
    const result = updateCommercialStatusInputSchema.safeParse({
      status: "lost",
      reason: "Preço acima do orçamento.",
    });
    expect(result.success).toBe(true);
  });

  it("rejeita um status fora do enum", () => {
    const result = updateCommercialStatusInputSchema.safeParse({ status: "unknown" });
    expect(result.success).toBe(false);
  });
});
