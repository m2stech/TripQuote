import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: vi.fn() }));
vi.mock("@/lib/supabase/server", () => ({ createClient: vi.fn() }));
vi.mock("@/features/quotes/repository", () => ({ getQuoteRepository: vi.fn() }));
vi.mock("@/features/prompts/repository/prompt-version-repository", () => ({
  getActivePromptVersion: vi.fn(),
}));
vi.mock("@/features/ai/orchestration/generate-quote-content", () => ({
  generateQuoteContent: vi.fn(),
}));
vi.mock("@/features/ai/vision/flight-image-input", () => ({
  buildFlightImagePart: vi.fn(),
}));

import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { getQuoteRepository } from "@/features/quotes/repository";
import { getActivePromptVersion } from "@/features/prompts/repository/prompt-version-repository";
import { generateQuoteContent } from "@/features/ai/orchestration/generate-quote-content";
import { buildFlightImagePart } from "@/features/ai/vision/flight-image-input";
import { AiGenerationError } from "@/features/ai/orchestration/errors";
import { runQuoteGeneration } from "@/features/quotes/actions/generation-orchestrator";
import { normalizeQuoteDraft } from "@/features/quotes/schemas/quote-form.schema";
import type { QuoteRecord } from "@/features/quotes/schemas/quote.schema";

const quoteId = "quote-1";
const userId = "user-1";

const quote: QuoteRecord = {
  id: quoteId,
  status: "draft",
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  createdBy: userId,
  form: normalizeQuoteDraft({}),
};

const promptVersion = {
  id: "prompt-1",
  version: 1,
  content: "texto",
  isActive: true,
  createdBy: "admin-1",
  createdAt: new Date().toISOString(),
};

function mockGenerationsTable(insertResult: { data: { id: string } | null; error: { message: string } | null }) {
  const update = vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ error: null }) });
  const insertSelectSingle = vi.fn().mockResolvedValue(insertResult);
  const insert = vi.fn().mockReturnValue({ select: vi.fn().mockReturnValue({ single: insertSelectSingle }) });
  return { update, insert };
}

describe("runQuoteGeneration", () => {
  let repository: {
    getById: ReturnType<typeof vi.fn>;
    markProcessing: ReturnType<typeof vi.fn>;
    updateGenerationResult: ReturnType<typeof vi.fn>;
  };
  let adminFrom: ReturnType<typeof vi.fn>;
  let userFrom: ReturnType<typeof vi.fn>;
  let auditInsert: ReturnType<typeof vi.fn>;
  let generationsUpdate: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    repository = {
      getById: vi.fn().mockResolvedValue(quote),
      markProcessing: vi.fn().mockResolvedValue(undefined),
      updateGenerationResult: vi.fn().mockImplementation(async (id, result) => ({
        ...quote,
        status: result.status,
        aiOutput: result.status === "done" ? result.aiOutput : undefined,
        errorMessage: result.status === "error" ? result.errorMessage : undefined,
      })),
    };
    vi.mocked(getQuoteRepository).mockResolvedValue(repository as never);
    vi.mocked(getActivePromptVersion).mockResolvedValue(promptVersion);
    vi.mocked(buildFlightImagePart).mockResolvedValue(null);

    const { update, insert } = mockGenerationsTable({ data: { id: "generation-1" }, error: null });
    generationsUpdate = update;
    auditInsert = vi.fn().mockResolvedValue({ error: null });

    userFrom = vi.fn().mockReturnValue({ insert });
    vi.mocked(createClient).mockResolvedValue({ from: userFrom } as never);

    adminFrom = vi.fn().mockImplementation((table: string) => {
      if (table === "generations") return { update: generationsUpdate };
      if (table === "audit_log") return { insert: auditInsert };
      throw new Error(`tabela inesperada: ${table}`);
    });
    vi.mocked(createAdminClient).mockReturnValue({ from: adminFrom } as never);
  });

  it("fluxo feliz: marca processing, registra generations/audit_log e retorna status done", async () => {
    vi.mocked(generateQuoteContent).mockResolvedValue({
      output: {
        coverTagline: "Tagline",
        destinationDescription: "Descrição",
        destinationAttractions: [],
        destinationPhoto: { status: "not_found", url: null, sourceUrl: null, caption: null },
        hotels: [],
        flightImageExtraction: null,
      },
      model: "gpt-4.1",
      promptTokens: 100,
      completionTokens: 50,
    });

    const result = await runQuoteGeneration(quoteId, userId);

    expect(repository.markProcessing).toHaveBeenCalledWith(quoteId);
    expect(generationsUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ status: "done", model: "gpt-4.1" }),
    );
    expect(auditInsert).toHaveBeenCalledWith(
      expect.objectContaining({ action: "quote.generation.completed" }),
    );
    expect(repository.updateGenerationResult).toHaveBeenCalledWith(
      quoteId,
      expect.objectContaining({ status: "done" }),
    );
    expect(result.status).toBe("done");
  });

  it("fluxo de erro: grava status error com mensagem técnica no banco e genérica ao usuário", async () => {
    vi.mocked(generateQuoteContent).mockRejectedValue(new AiGenerationError("detalhe técnico sensível"));

    const result = await runQuoteGeneration(quoteId, userId);

    expect(generationsUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ status: "error", error_message: "detalhe técnico sensível" }),
    );
    expect(auditInsert).toHaveBeenCalledWith(
      expect.objectContaining({ action: "quote.generation.failed" }),
    );
    expect(repository.updateGenerationResult).toHaveBeenCalledWith(
      quoteId,
      expect.objectContaining({
        status: "error",
        errorMessage: "Não foi possível gerar o orçamento. Tente novamente.",
      }),
    );
    expect(result.errorMessage).toBe("Não foi possível gerar o orçamento. Tente novamente.");
  });

  it("lança erro se o orçamento não existir", async () => {
    repository.getById.mockResolvedValue(null);
    await expect(runQuoteGeneration(quoteId, userId)).rejects.toThrow("Orçamento não encontrado.");
  });
});
