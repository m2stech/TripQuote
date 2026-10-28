import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import { AiGenerationError } from "@/features/ai/orchestration/errors";
import { generateCruiseContent } from "@/features/ai/orchestration/generate-cruise-content";
import { generateQuoteContent } from "@/features/ai/orchestration/generate-quote-content";
import { buildCruiseItineraryImagePart } from "@/features/ai/vision/cruise-itinerary-image-input";
import { buildFlightImagePart } from "@/features/ai/vision/flight-image-input";
import { estimateCostUsd } from "@/features/ai/pricing/estimate-cost";
import { buildCruisePresentation, type CruiseQuoteRecord } from "@/features/pptx/build-cruise-presentation";
import { buildQuotePresentation, type TerrestrialQuoteRecord } from "@/features/pptx/build-quote-presentation";
import { uploadGeneratedPptx } from "@/features/pptx/storage";
import { getActivePromptVersion } from "@/features/prompts/repository/prompt-version-repository";
import type { PromptVersionRecord } from "@/features/prompts/schemas/prompt-version.schema";
import { getQuoteRepository } from "@/features/quotes/repository";
import type { QuoteRepository } from "@/features/quotes/repository/types";
import type { AnyGenerationOutput } from "@/features/quotes/schemas/product.schema";
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
    promptVersion = await getActivePromptVersion(adminSupabase, quote.form.productType);
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

  try {
    if (quote.form.productType === "cruzeiro") {
      const itineraryImagePart = await buildCruiseItineraryImagePart(supabase, quote.form.itineraryImage);
      const result = await generateCruiseContent({ form: quote.form, promptVersion, itineraryImagePart });
      const doneQuote = await finishGeneration(result, promptVersion, {
        adminSupabase,
        supabase,
        repository,
        userId,
        quoteId,
        generationId,
      });
      // O guard de `productType` acima já garantiu o ramo cruzeiro;
      // `updateGenerationResult` só altera `status`/`aiOutput`, não o tipo de
      // produto do `form` já carregado.
      if (doneQuote.form.productType !== "cruzeiro") {
        throw new Error("Estado inesperado: orçamento terrestre no fluxo de cruzeiro.");
      }
      const cruiseQuote = doneQuote as CruiseQuoteRecord;

      return await buildAndStorePptx(
        cruiseQuote,
        (sb, q) => buildCruisePresentation(sb, q),
        supabase,
        adminSupabase,
        repository,
        userId,
        quoteId,
      );
    }

    const flightImagePart = await buildFlightImagePart(supabase, quote.form.flightImage);
    const result = await generateQuoteContent({ form: quote.form, promptVersion, flightImagePart });
    const doneQuote = await finishGeneration(result, promptVersion, {
      adminSupabase,
      supabase,
      repository,
      userId,
      quoteId,
      generationId,
    });
    // O guard de `productType` acima já garantiu o ramo terrestre;
    // `updateGenerationResult` só altera `status`/`aiOutput`, não o tipo de
    // produto do `form` já carregado.
    if (doneQuote.form.productType !== "terrestre") {
      throw new Error("Estado inesperado: orçamento de cruzeiro no fluxo terrestre.");
    }
    const terrestrialQuote = doneQuote as TerrestrialQuoteRecord;

    return await buildAndStorePptx(
      terrestrialQuote,
      (sb, q) => buildQuotePresentation(sb, q),
      supabase,
      adminSupabase,
      repository,
      userId,
      quoteId,
    );
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

interface FinishGenerationContext {
  adminSupabase: SupabaseClient<Database>;
  supabase: SupabaseClient<Database>;
  repository: QuoteRepository;
  userId: string;
  quoteId: string;
  generationId: string;
}

/**
 * Grava o resultado comum a qualquer tipo de produto (modelo, tokens, custo
 * em `generations`; auditoria de sucesso; `status: "done"` + `aiOutput` no
 * orçamento) — compartilhado pelos ramos terrestre e cruzeiro de
 * `runQuoteGeneration`, que diferem só na chamada à IA e na montagem do
 * .pptx (específica por tipo, feita pelo chamador).
 */
async function finishGeneration(
  result: { model: string; promptTokens: number; completionTokens: number; output: unknown },
  promptVersion: PromptVersionRecord,
  context: FinishGenerationContext,
): Promise<QuoteRecord> {
  const { adminSupabase, repository, userId, quoteId, generationId } = context;

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

  return repository.updateGenerationResult(quoteId, {
    status: "done",
    aiOutput: result.output as AnyGenerationOutput,
  });
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
async function buildAndStorePptx<T extends TerrestrialQuoteRecord | CruiseQuoteRecord>(
  doneQuote: T,
  buildPresentation: (supabase: SupabaseClient<Database>, quote: T) => Promise<Buffer>,
  supabase: SupabaseClient<Database>,
  adminSupabase: SupabaseClient<Database>,
  repository: QuoteRepository,
  userId: string,
  quoteId: string,
): Promise<QuoteRecord> {
  try {
    const pptxBuffer = await buildPresentation(supabase, doneQuote);
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
