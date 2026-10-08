"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

import { EmptyState } from "@/components/empty-state";
import { ErrorState } from "@/components/error-state";
import { LoadingState } from "@/components/loading-state";
import { SectionCard } from "@/components/section-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  exportUsageCsvAction,
  listUsageAction,
  type UsageView,
} from "@/features/usage/actions/usage-actions";
import type { UsageFilters } from "@/features/usage/schemas/usage.schema";
import { AuditLogSection } from "@/features/usage/components/AuditLogSection";
import { ModelPricingSection } from "@/features/usage/components/ModelPricingSection";

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

function formatUsd(value: number): string {
  return value.toLocaleString("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 4 });
}

const STATUS_LABELS: Record<string, string> = {
  draft: "Rascunho",
  processing: "Processando",
  done: "Concluído",
  error: "Erro",
};

/**
 * Painel de consumo de IA (M9): tokens e custo estimado por geração, com
 * filtros de período/usuário/orçamento e exportação CSV. A leitura é feita
 * no client (como as demais telas admin) para evitar que o Next (Cache
 * Components) tente pré-renderizar uma página que depende de
 * autenticação/cookies de sessão.
 */
export function UsageManagementScreen() {
  const [filters, setFilters] = useState<UsageFilters>({});
  const [usage, setUsage] = useState<UsageView | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState(false);

  const loadUsage = useCallback(async (nextFilters: UsageFilters) => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await listUsageAction(nextFilters);
      setUsage(result);
    } catch {
      setError("Não foi possível carregar o consumo de IA.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    const timeout = setTimeout(() => {
      void loadUsage(filters);
    }, 0);
    return () => clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- recarrega só ao aplicar filtros (botão), não a cada tecla
  }, []);

  function handleApplyFilters() {
    void loadUsage(filters);
  }

  async function handleExportCsv() {
    setIsExporting(true);
    try {
      const csv = await exportUsageCsvAction(filters);
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `consumo-ia-${new Date().toISOString().slice(0, 10)}.csv`;
      link.click();
      URL.revokeObjectURL(url);
    } catch {
      toast.error("Não foi possível exportar o CSV.");
    } finally {
      setIsExporting(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <SectionCard
        number={4}
        title="Consumo de IA"
        description="Tokens e custo estimado por geração, com filtros de período, usuário e orçamento."
      >
        <div className="snow-grid-2">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="usage-from-date">De</Label>
            <Input
              id="usage-from-date"
              type="date"
              value={filters.fromDate ?? ""}
              onChange={(event) =>
                setFilters((prev) => ({ ...prev, fromDate: event.target.value || undefined }))
              }
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="usage-to-date">Até</Label>
            <Input
              id="usage-to-date"
              type="date"
              value={filters.toDate ?? ""}
              onChange={(event) =>
                setFilters((prev) => ({ ...prev, toDate: event.target.value || undefined }))
              }
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="usage-quote-id">ID do orçamento</Label>
            <Input
              id="usage-quote-id"
              placeholder="Opcional"
              value={filters.quoteId ?? ""}
              onChange={(event) =>
                setFilters((prev) => ({ ...prev, quoteId: event.target.value || undefined }))
              }
            />
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="snow-generate" size="generate" onClick={handleApplyFilters}>
            Filtrar
          </Button>
          <Button
            type="button"
            variant="outline"
            disabled={isExporting || !usage || usage.rows.length === 0}
            onClick={() => void handleExportCsv()}
          >
            {isExporting ? "Exportando…" : "Exportar CSV"}
          </Button>
        </div>

        {isLoading ? <LoadingState label="Carregando consumo…" /> : null}

        {!isLoading && error ? (
          <ErrorState description={error} onRetry={() => void loadUsage(filters)} />
        ) : null}

        {!isLoading && !error && usage && usage.rows.length === 0 ? (
          <EmptyState
            title="Nenhuma geração encontrada"
            description="Ajuste os filtros ou aguarde a primeira geração via IA."
          />
        ) : null}

        {!isLoading && !error && usage && usage.rows.length > 0 ? (
          <>
            <div className="snow-grid-2 sm:grid-cols-4">
              <SummaryTile label="Gerações" value={String(usage.summary.totalGenerations)} />
              <SummaryTile label="Tokens de entrada" value={usage.summary.totalPromptTokens.toLocaleString("pt-BR")} />
              <SummaryTile label="Tokens de saída" value={usage.summary.totalCompletionTokens.toLocaleString("pt-BR")} />
              <SummaryTile label="Custo estimado" value={formatUsd(usage.summary.totalEstimatedCostUsd)} />
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-muted-foreground border-border border-b text-left">
                    <th className="py-2 pr-3 font-medium">Data</th>
                    <th className="py-2 pr-3 font-medium">Usuário</th>
                    <th className="py-2 pr-3 font-medium">Destino</th>
                    <th className="py-2 pr-3 font-medium">Modelo</th>
                    <th className="py-2 pr-3 text-right font-medium">Tokens</th>
                    <th className="py-2 pr-3 text-right font-medium">Custo</th>
                    <th className="py-2 pr-3 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {usage.rows.map((row) => (
                    <tr key={row.id} className="border-border border-b last:border-0">
                      <td className="py-2 pr-3 whitespace-nowrap">{formatDateTime(row.createdAt)}</td>
                      <td className="py-2 pr-3">{row.requestedByEmail ?? row.requestedBy}</td>
                      <td className="py-2 pr-3">{row.quoteDestination ?? "—"}</td>
                      <td className="py-2 pr-3">{row.model}</td>
                      <td className="py-2 pr-3 text-right whitespace-nowrap">
                        {row.promptTokens.toLocaleString("pt-BR")} / {row.completionTokens.toLocaleString("pt-BR")}
                      </td>
                      <td className="py-2 pr-3 text-right whitespace-nowrap">{formatUsd(row.estimatedCostUsd)}</td>
                      <td className="py-2 pr-3">{STATUS_LABELS[row.status] ?? row.status}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        ) : null}
      </SectionCard>

      <ModelPricingSection />
      <AuditLogSection />
    </div>
  );
}

function SummaryTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-snow-card border-border bg-muted/40 flex flex-col gap-1 border p-3">
      <span className="text-muted-foreground text-xs">{label}</span>
      <span className="text-foreground text-lg font-semibold">{value}</span>
    </div>
  );
}
