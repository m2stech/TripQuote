"use server";

import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth/require-admin";
import {
  listGenerationUsage,
  listAuditLog,
  summarizeUsage,
} from "@/features/usage/repository/usage-repository";
import {
  usageFiltersSchema,
  auditLogFiltersSchema,
  type GenerationUsageRow,
  type UsageSummary,
  type AuditLogRow,
} from "@/features/usage/schemas/usage.schema";

export interface UsageView {
  rows: GenerationUsageRow[];
  summary: UsageSummary;
}

export async function listUsageAction(filters: unknown = {}): Promise<UsageView> {
  await requireAdmin();
  const parsed = usageFiltersSchema.parse(filters);

  const supabase = await createClient();
  const rows = await listGenerationUsage(supabase, parsed);
  return { rows, summary: summarizeUsage(rows) };
}

function toCsvValue(value: string | number): string {
  const text = String(value);
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

/** CSV do consumo filtrado (CLAUDE.md/PLAN.md: "exportação CSV"), já com cabeçalho em pt-BR. */
export async function exportUsageCsvAction(filters: unknown = {}): Promise<string> {
  await requireAdmin();
  const parsed = usageFiltersSchema.parse(filters);

  const supabase = await createClient();
  const rows = await listGenerationUsage(supabase, parsed);

  const header = [
    "Data",
    "Usuário",
    "Orçamento",
    "Destino",
    "Modelo",
    "Tokens de entrada",
    "Tokens de saída",
    "Custo estimado (USD)",
    "Status",
  ];

  const lines = rows.map((row) =>
    [
      row.createdAt,
      row.requestedByEmail ?? row.requestedBy,
      row.quoteId,
      row.quoteDestination ?? "",
      row.model,
      row.promptTokens,
      row.completionTokens,
      row.estimatedCostUsd,
      row.status,
    ]
      .map(toCsvValue)
      .join(","),
  );

  return [header.join(","), ...lines].join("\n");
}

export async function listAuditLogAction(filters: unknown = {}): Promise<AuditLogRow[]> {
  await requireAdmin();
  const parsed = auditLogFiltersSchema.parse(filters);

  const supabase = await createClient();
  return listAuditLog(supabase, parsed);
}
