import "server-only";

import { z } from "zod";

/** Uma linha de `generations`, enriquecida com o e-mail do usuário e o destino do orçamento (join, só leitura — painel de consumo). */
export const generationUsageRowSchema = z.object({
  id: z.string(),
  quoteId: z.string(),
  quoteDestination: z.string().nullable(),
  requestedBy: z.string(),
  requestedByEmail: z.string().nullable(),
  model: z.string(),
  promptTokens: z.number(),
  completionTokens: z.number(),
  estimatedCostUsd: z.number(),
  status: z.enum(["draft", "processing", "done", "error"]),
  createdAt: z.string(),
});

export type GenerationUsageRow = z.infer<typeof generationUsageRowSchema>;

export const usageFiltersSchema = z.object({
  userId: z.string().optional(),
  quoteId: z.string().optional(),
  fromDate: z.string().optional(),
  toDate: z.string().optional(),
});

export type UsageFilters = z.infer<typeof usageFiltersSchema>;

export interface UsageSummary {
  totalGenerations: number;
  totalPromptTokens: number;
  totalCompletionTokens: number;
  totalEstimatedCostUsd: number;
}

/** Uma linha de `audit_log`, enriquecida com o e-mail do autor (join, só leitura — tela de auditoria). */
export const auditLogRowSchema = z.object({
  id: z.string(),
  actorId: z.string(),
  actorEmail: z.string().nullable(),
  action: z.string(),
  entityType: z.string(),
  entityId: z.string().nullable(),
  metadata: z.record(z.string(), z.unknown()),
  createdAt: z.string(),
});

export type AuditLogRow = z.infer<typeof auditLogRowSchema>;

export const auditLogFiltersSchema = z.object({
  actorId: z.string().optional(),
  entityType: z.string().optional(),
  fromDate: z.string().optional(),
  toDate: z.string().optional(),
});

export type AuditLogFilters = z.infer<typeof auditLogFiltersSchema>;
