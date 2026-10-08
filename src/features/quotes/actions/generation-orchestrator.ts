import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import { AiGenerationError } from "@/features/ai/orchestration/errors";
import { generateQuoteContent } from "@/features/ai/orchestration/generate-quote-content";
import { buildFlightImagePart } from "@/features/ai/vision/flight-image-input";
import { estimateCostUsd } from "@/features/ai/pricing/estimate-cost";
import { buildQuotePresentation } from "@/features/pptx/build-quote-presentation";
import { uploadGeneratedPptx } from "@/features/pptx/storage";
import { getActivePromptVersion } from "@/features/prompts/repository/prompt-version-repository";
import { getQuoteRepository } from "@/features/quotes/repository";
import type { QuoteRepository } from "@/features/quotes/repository/types";
import type { QuoteRecord } from "@/features/quotes/schemas/quote.schema";
import {
  enforceGenerationRateLimit,
  GenerationRateLimitError,
} from "@/features/usage/rate-limit/generation-rate-limit";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/supabase/types";

const GENERIC_ERROR_MESSAGE = "Não foi possível gerar o orçamento. Tente novamente.";

/**
 * Orquestra uma geração via IA de ponta a ponta: lê o orçamento e o prompt
 * ativo, chama a OpenAI, grava auditoria/custo em `generations`/`audit_log`
 * e atualiza o status do orçamento. Chamada por `regenerateQuoteAction`
 * (Server Action em `quote-actions.ts`) — não é ela mesma uma Server Action,
 * para manter `features/ai` e `features/prompts` desacoplados de `quotes`.
 *
 * `generations`/`audit_log` não têm policy de UPDATE/INSERT para o client
 * comum em todos os casos (ver supabase/migrations/..._document_service_role_only_tables.sql),
 * por isso usa o client admin para ler o prompt ativo e para o update final
 * de `generations` e o insert em `audit_log`. O insert inicial em
 * `generations` e a leitura do quote usam o client do usuário (RLS permite
 * ao dono).
 */
export async function runQuoteGeneration(quoteId: string, userId: string): Promise<QuoteRecord> {
  const adminSupabase = createAdminClient();
  const supabase = await createClient();
  const repository = await getQuoteRepository();

  const quote = await repository.getById(quoteId);
  if (!quote) {
    throw new Error("Orçamento não encontrado.");
  }

  try {
    await enforceGenerationRateLimit(adminSupabase, userId);
  } catch (error) {
    if (error instanceof GenerationRateLimitError) throw error;
    throw await logPreflightFailureAndGetGenericError(adminSupabase, userId, quoteId, error);
  }

  await repository.markProcessing(quoteId);

  let promptVersion;
  try {
    promptVersion = await getActivePromptVersion(adminSupabase);
  } catch (error) {
    throw await logPreflightFailureAndGetGenericError(adminSupabase, userId, quoteId, error);
  }

  const { data: generationRow, error: generationInsertError } = await supabase
    .from("generations")
    .insert({
      quote_id: quoteId,
      prompt_version_id: promptVersion.id,
      requested_by: userId,
      model: "pending",
      status: "processing",
    })
    .select("id")
    .single();
  if (generationInsertError || !generationRow) {
    const technicalReason = generationInsertError?.message ?? "Falha desconhecida ao registrar a geração.";

    await adminSupabase.from("audit_log").insert({
      actor_id: userId,
      action: "quote.generation.failed",
      entity_type: "quote",
      entity_id: quoteId,
      metadata: { reason: technicalReason },
    });

    return repository.updateGenerationResult(quoteId, {
      status: "error",
      errorMessage: GENERIC_ERROR_MESSAGE,
    });
  }
  const generationId = generationRow.id;

  const flightImagePart = await buildFlightImagePart(supabase, quote.form.flightImage);

  try {
    const result = await generateQuoteContent({ form: quote.form, promptVersion, flightImagePart });
    const estimatedCostUsd = await estimateCostUsd(
      adminSupabase,
      result.model,
      result.promptTokens,
      result.completionTokens,
    );

    await adminSupabase
      .from("generations")
      .update({
        model: result.model,
        prompt_tokens: result.promptTokens,
        completion_tokens: result.completionTokens,
        estimated_cost_usd: estimatedCostUsd,
        status: "done",
      })
      .eq("id", generationId);

    await adminSupabase.from("audit_log").insert({
      actor_id: userId,
      action: "quote.generation.completed",
      entity_type: "quote",
      entity_id: quoteId,
      metadata: { generationId, model: result.model, promptVersionId: promptVersion.id },
    });

    const doneQuote = await repository.updateGenerationResult(quoteId, {
      status: "done",
      aiOutput: result.output,
    });

    return await buildAndStorePptx(doneQuote, supabase, adminSupabase, repository, userId, quoteId);
  } catch (error) {
    const technicalReason =
      error instanceof AiGenerationError || error instanceof Error ? error.message : "Erro desconhecido.";

    await adminSupabase
      .from("generations")
      .update({ status: "error", error_message: technicalReason })
      .eq("id", generationId);

    await adminSupabase.from("audit_log").insert({
      actor_id: userId,
      action: "quote.generation.failed",
      entity_type: "quote",
      entity_id: quoteId,
      metadata: { generationId, reason: technicalReason },
    });

    return repository.updateGenerationResult(quoteId, {
      status: "error",
      errorMessage: GENERIC_ERROR_MESSAGE,
    });
  }
}

/**
 * Loga em `audit_log` uma falha ocorrida antes de existir uma linha em
 * `generations` (rate limit, leitura do prompt ativo) e devolve um erro
 * genérico e seguro para o client — a mensagem técnica (ex.: detalhe do
 * Postgres) nunca deve escapar para o usuário final.
 */
async function logPreflightFailureAndGetGenericError(
  adminSupabase: SupabaseClient<Database>,
  userId: string,
  quoteId: string,
  error: unknown,
): Promise<Error> {
  const technicalReason = error instanceof Error ? error.message : "Erro desconhecido.";

  await adminSupabase.from("audit_log").insert({
    actor_id: userId,
    action: "quote.generation.failed",
    entity_type: "quote",
    entity_id: quoteId,
    metadata: { reason: technicalReason },
  });

  return new Error(GENERIC_ERROR_MESSAGE);
}

/**
 * Monta o .pptx determinístico e salva no Storage, isolado em seu próprio
 * `try/catch`: a montagem é uma etapa subsequente e independente da geração
 * via IA (já concluída com sucesso em `doneQuote`) — uma falha aqui (ex.:
 * timeout ao buscar uma foto externa) não deve reverter o `status: "done"`
 * do conteúdo já gerado. Em caso de falha, registra em `audit_log` e
 * retorna o quote com `pptxStoragePath` ainda nulo (usuário pode tentar
 * gerar novamente).
 */
async function buildAndStorePptx(
  doneQuote: QuoteRecord,
  supabase: SupabaseClient<Database>,
  adminSupabase: SupabaseClient<Database>,
  repository: QuoteRepository,
  userId: string,
  quoteId: string,
): Promise<QuoteRecord> {
  try {
    const pptxBuffer = await buildQuotePresentation(supabase, doneQuote);
    const storagePath = await uploadGeneratedPptx(supabase, quoteId, pptxBuffer);
    return await repository.updatePptxStoragePath(quoteId, storagePath);
  } catch (pptxError) {
    const reason = pptxError instanceof Error ? pptxError.message : "Erro desconhecido ao montar o arquivo.";

    await adminSupabase.from("audit_log").insert({
      actor_id: userId,
      action: "quote.pptx.failed",
      entity_type: "quote",
      entity_id: quoteId,
      metadata: { reason },
    });

    return doneQuote;
  }
}
