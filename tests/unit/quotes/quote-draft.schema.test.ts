import { describe, expect, it } from "vitest";

import {
  normalizeQuoteDraft,
  quoteDraftSchema,
  quoteFormDefaultValues,
} from "@/features/quotes/schemas/quote-form.schema";

describe("quoteDraftSchema", () => {
  it("aceita um rascunho vazio (nenhum campo preenchido)", () => {
    expect(quoteDraftSchema.safeParse({}).success).toBe(true);
  });

  it("aceita um rascunho parcial (apenas a agência preenchida)", () => {
    const result = quoteDraftSchema.safeParse({ general: { agency: "Primus Turismo" } });
    expect(result.success).toBe(true);
  });

  it("ainda rejeita um tipo de valor fora das opções permitidas", () => {
    const result = quoteDraftSchema.safeParse({ general: { priceType: "Inexistente" } });
    expect(result.success).toBe(false);
  });
});

describe("normalizeQuoteDraft", () => {
  it("preenche campos ausentes com os valores padrão", () => {
    const normalized = normalizeQuoteDraft(quoteDraftSchema.parse({}));
    expect(normalized).toEqual(quoteFormDefaultValues);
  });

  it("preserva os campos informados e completa o restante", () => {
    const parsed = quoteDraftSchema.parse({ general: { agency: "Primus Turismo" } });
    const normalized = normalizeQuoteDraft(parsed);
    expect(normalized.general.agency).toBe("Primus Turismo");
    expect(normalized.general.destination).toBe("");
    expect(normalized.inclusions).toEqual([]);
    expect(normalized.hotels).toEqual([]);
  });

  it("preserva anexos informados", () => {
    const attachment = {
      fileName: "logo.png",
      storagePath: "quote-1/attachment-1-logo.png",
      mimeType: "image/png",
      sizeBytes: 1024,
    };
    const parsed = quoteDraftSchema.parse({ agencyLogo: attachment });
    const normalized = normalizeQuoteDraft(parsed);
    expect(normalized.agencyLogo).toEqual(attachment);
    expect(normalized.flightImage).toBeNull();
  });
});
