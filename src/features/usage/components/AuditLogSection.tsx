"use client";

import { useCallback, useEffect, useState } from "react";

import { EmptyState } from "@/components/empty-state";
import { ErrorState } from "@/components/error-state";
import { LoadingState } from "@/components/loading-state";
import { SectionCard } from "@/components/section-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { listAuditLogAction } from "@/features/usage/actions/usage-actions";
import type { AuditLogFilters, AuditLogRow } from "@/features/usage/schemas/usage.schema";

function formatDateTime(isoDate: string): string {
  const date = new Date(isoDate);
  if (Number.isNaN(date.getTime())) return isoDate;
  return date.toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

const ENTITY_TYPE_LABELS: Record<string, string> = {
  user: "Usuário",
  prompt_version: "Prompt",
  branding_settings: "Identidade visual",
  model_pricing: "Preço de modelo",
  quote: "Orçamento",
};

/** `metadata` traz contexto técnico (ex.: motivo de uma falha) gravado por cada feature — nunca o conteúdo do prompt (ver `generation-orchestrator.ts`, que só grava IDs/mensagens de erro). */
function formatMetadata(metadata: Record<string, unknown>): string | null {
  const entries = Object.entries(metadata);
  if (entries.length === 0) return null;
  return entries.map(([key, value]) => `${key}: ${String(value)}`).join(" · ");
}

/** Tela de auditoria (M9): lista `audit_log`, com filtros por tipo de entidade e período. */
export function AuditLogSection() {
  const [filters, setFilters] = useState<AuditLogFilters>({});
  const [entries, setEntries] = useState<AuditLogRow[] | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadAuditLog = useCallback(async (nextFilters: AuditLogFilters) => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await listAuditLogAction(nextFilters);
      setEntries(result);
    } catch {
      setError("Não foi possível carregar a auditoria.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    const timeout = setTimeout(() => {
      void loadAuditLog(filters);
    }, 0);
    return () => clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- recarrega só ao aplicar filtros (botão), não a cada tecla
  }, []);

  return (
    <SectionCard
      number={6}
      title="Auditoria"
      description="Ações administrativas e de geração registradas no sistema, mais recentes primeiro."
    >
      <div className="snow-grid-2">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="audit-from-date">De</Label>
          <Input
            id="audit-from-date"
            type="date"
            value={filters.fromDate ?? ""}
            onChange={(event) =>
              setFilters((prev) => ({ ...prev, fromDate: event.target.value || undefined }))
            }
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="audit-to-date">Até</Label>
          <Input
            id="audit-to-date"
            type="date"
            value={filters.toDate ?? ""}
            onChange={(event) =>
              setFilters((prev) => ({ ...prev, toDate: event.target.value || undefined }))
            }
          />
        </div>
      </div>

      <div className="flex justify-end">
        <Button type="button" variant="snow-generate" size="generate" onClick={() => void loadAuditLog(filters)}>
          Filtrar
        </Button>
      </div>

      {isLoading ? <LoadingState label="Carregando auditoria…" /> : null}

      {!isLoading && error ? (
        <ErrorState description={error} onRetry={() => void loadAuditLog(filters)} />
      ) : null}

      {!isLoading && !error && entries && entries.length === 0 ? (
        <EmptyState title="Nenhum registro de auditoria encontrado" description="Ajuste os filtros de período." />
      ) : null}

      {!isLoading && !error && entries && entries.length > 0 ? (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-muted-foreground border-border border-b text-left">
                <th className="py-2 pr-3 font-medium">Data</th>
                <th className="py-2 pr-3 font-medium">Autor</th>
                <th className="py-2 pr-3 font-medium">Ação</th>
                <th className="py-2 pr-3 font-medium">Entidade</th>
                <th className="py-2 pr-3 font-medium">Detalhes</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((entry) => (
                <tr key={entry.id} className="border-border border-b last:border-0">
                  <td className="py-2 pr-3 whitespace-nowrap">{formatDateTime(entry.createdAt)}</td>
                  <td className="py-2 pr-3">{entry.actorEmail ?? entry.actorId}</td>
                  <td className="py-2 pr-3">{entry.action}</td>
                  <td className="py-2 pr-3">{ENTITY_TYPE_LABELS[entry.entityType] ?? entry.entityType}</td>
                  <td className="text-muted-foreground py-2 pr-3">{formatMetadata(entry.metadata) ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </SectionCard>
  );
}
