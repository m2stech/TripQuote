import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/lib/supabase/types";
import {
  generationUsageRowSchema,
  auditLogRowSchema,
  type GenerationUsageRow,
  type UsageFilters,
  type UsageSummary,
  type AuditLogRow,
  type AuditLogFilters,
} from "@/features/usage/schemas/usage.schema";

/**
 * Painel de consumo (M9): lista `generations` com filtros de usuário,
 * orçamento e período, enriquecida com e-mail do usuário e destino do
 * orçamento. Sem relacionamento embutido no `select` (o projeto não usa esse
 * recurso do PostgREST em nenhum outro repository) — busca as linhas de
 * `generations` e depois resolve `profiles`/`quotes` em duas consultas
 * avulsas, unidas em memória por `Map`.
 */
export async function listGenerationUsage(
  supabase: SupabaseClient<Database>,
  filters: UsageFilters,
): Promise<GenerationUsageRow[]> {
  let query = supabase.from("generations").select("*").order("created_at", { ascending: false });

  if (filters.userId) query = query.eq("requested_by", filters.userId);
  if (filters.quoteId) query = query.eq("quote_id", filters.quoteId);
  if (filters.fromDate) query = query.gte("created_at", filters.fromDate);
  if (filters.toDate) query = query.lte("created_at", filters.toDate);

  const { data, error } = await query;
  if (error) {
    throw new Error(`Não foi possível carregar o consumo de IA: ${error.message}`);
  }
  if (data.length === 0) return [];

  const userIds = [...new Set(data.map((row) => row.requested_by))];
  const quoteIds = [...new Set(data.map((row) => row.quote_id))];

  const [{ data: profiles, error: profilesError }, { data: quotes, error: quotesError }] = await Promise.all([
    supabase.from("profiles").select("id, email").in("id", userIds),
    supabase.from("quotes").select("id, destination").in("id", quoteIds),
  ]);
  if (profilesError) {
    throw new Error(`Não foi possível carregar os usuários do consumo: ${profilesError.message}`);
  }
  if (quotesError) {
    throw new Error(`Não foi possível carregar os orçamentos do consumo: ${quotesError.message}`);
  }

  const emailByUserId = new Map((profiles ?? []).map((profile) => [profile.id, profile.email]));
  const destinationByQuoteId = new Map((quotes ?? []).map((quote) => [quote.id, quote.destination]));

  return data.map((row) => {
    const parsed = generationUsageRowSchema.safeParse({
      id: row.id,
      quoteId: row.quote_id,
      quoteDestination: destinationByQuoteId.get(row.quote_id) ?? null,
      requestedBy: row.requested_by,
      requestedByEmail: emailByUserId.get(row.requested_by) ?? null,
      model: row.model,
      promptTokens: row.prompt_tokens,
      completionTokens: row.completion_tokens,
      estimatedCostUsd: row.estimated_cost_usd,
      status: row.status,
      createdAt: row.created_at,
    });
    if (!parsed.success) {
      throw new Error("Registro de consumo com formato inválido.");
    }
    return parsed.data;
  });
}

export function summarizeUsage(rows: GenerationUsageRow[]): UsageSummary {
  return rows.reduce<UsageSummary>(
    (summary, row) => ({
      totalGenerations: summary.totalGenerations + 1,
      totalPromptTokens: summary.totalPromptTokens + row.promptTokens,
      totalCompletionTokens: summary.totalCompletionTokens + row.completionTokens,
      totalEstimatedCostUsd: summary.totalEstimatedCostUsd + row.estimatedCostUsd,
    }),
    { totalGenerations: 0, totalPromptTokens: 0, totalCompletionTokens: 0, totalEstimatedCostUsd: 0 },
  );
}

/** Tela de auditoria (M9): lista `audit_log` com filtros, enriquecida com o e-mail do autor. */
export async function listAuditLog(
  supabase: SupabaseClient<Database>,
  filters: AuditLogFilters,
): Promise<AuditLogRow[]> {
  let query = supabase.from("audit_log").select("*").order("created_at", { ascending: false }).limit(500);

  if (filters.actorId) query = query.eq("actor_id", filters.actorId);
  if (filters.entityType) query = query.eq("entity_type", filters.entityType);
  if (filters.fromDate) query = query.gte("created_at", filters.fromDate);
  if (filters.toDate) query = query.lte("created_at", filters.toDate);

  const { data, error } = await query;
  if (error) {
    throw new Error(`Não foi possível carregar a auditoria: ${error.message}`);
  }
  if (data.length === 0) return [];

  const actorIds = [...new Set(data.map((row) => row.actor_id))];
  const { data: profiles, error: profilesError } = await supabase
    .from("profiles")
    .select("id, email")
    .in("id", actorIds);
  if (profilesError) {
    throw new Error(`Não foi possível carregar os autores da auditoria: ${profilesError.message}`);
  }

  const emailByActorId = new Map((profiles ?? []).map((profile) => [profile.id, profile.email]));

  return data.map((row) => {
    const parsed = auditLogRowSchema.safeParse({
      id: row.id,
      actorId: row.actor_id,
      actorEmail: emailByActorId.get(row.actor_id) ?? null,
      action: row.action,
      entityType: row.entity_type,
      entityId: row.entity_id,
      metadata: row.metadata,
      createdAt: row.created_at,
    });
    if (!parsed.success) {
      throw new Error("Registro de auditoria com formato inválido.");
    }
    return parsed.data;
  });
}
