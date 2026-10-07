import { describe, expect, it, vi } from "vitest";

import { downloadStorageObject, uploadGeneratedPptx } from "@/features/pptx/storage";

function createFakeSupabase(overrides: Partial<{ download: unknown; upload: unknown }> = {}) {
  return {
    storage: {
      from: vi.fn().mockReturnValue({
        download: overrides.download ?? vi.fn(),
        upload: overrides.upload ?? vi.fn(),
      }),
    },
  } as never;
}

describe("downloadStorageObject", () => {
  it("retorna o buffer quando o download é bem-sucedido", async () => {
    const blob = new Blob([new TextEncoder().encode("conteudo")]);
    const download = vi.fn().mockResolvedValue({ data: blob, error: null });
    const supabase = createFakeSupabase({ download });

    const buffer = await downloadStorageObject(supabase, "agency-logos", "quote-1/logo.png");

    expect(buffer).toBeInstanceOf(Buffer);
  });

  it("lança erro claro quando o download falha", async () => {
    const download = vi.fn().mockResolvedValue({ data: null, error: { message: "not found" } });
    const supabase = createFakeSupabase({ download });

    await expect(downloadStorageObject(supabase, "agency-logos", "quote-1/logo.png")).rejects.toThrow(
      "Não foi possível baixar o arquivo",
    );
  });
});

describe("uploadGeneratedPptx", () => {
  it("usa o path fixo {quoteId}/orcamento.pptx com upsert", async () => {
    const upload = vi.fn().mockResolvedValue({ error: null });
    const from = vi.fn().mockReturnValue({ upload });
    const supabase = { storage: { from } } as never;

    const path = await uploadGeneratedPptx(supabase, "quote-123", Buffer.from("fake-pptx"));

    expect(path).toBe("quote-123/orcamento.pptx");
    expect(from).toHaveBeenCalledWith("generated-pptx");
    expect(upload).toHaveBeenCalledWith(
      "quote-123/orcamento.pptx",
      expect.anything(),
      expect.objectContaining({ upsert: true }),
    );
  });

  it("lança erro claro quando o upload falha", async () => {
    const upload = vi.fn().mockResolvedValue({ error: { message: "quota exceeded" } });
    const from = vi.fn().mockReturnValue({ upload });
    const supabase = { storage: { from } } as never;

    await expect(uploadGeneratedPptx(supabase, "quote-123", Buffer.from("x"))).rejects.toThrow(
      "Não foi possível salvar o arquivo gerado",
    );
  });
});
