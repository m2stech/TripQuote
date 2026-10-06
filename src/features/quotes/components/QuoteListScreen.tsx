"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";

import { EmptyState } from "@/components/empty-state";
import { ErrorState } from "@/components/error-state";
import { Hero } from "@/components/hero";
import { LoadingState } from "@/components/loading-state";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { listQuotesAction } from "@/features/quotes/actions/quote-actions";
import { QuoteStatusBadge } from "@/features/quotes/components/QuoteStatusBadge";
import { quoteStatusLabels, quoteStatusValues, type QuoteStatus } from "@/features/quotes/schemas/quote.schema";
import type { QuoteSummary } from "@/features/quotes/schemas/quote.schema";

const STATUS_FILTER_ALL = "all" as const;
type StatusFilterValue = QuoteStatus | typeof STATUS_FILTER_ALL;

interface Filters {
  search: string;
  status: StatusFilterValue;
  destination: string;
  periodStart: string;
  periodEnd: string;
}

const INITIAL_FILTERS: Filters = {
  search: "",
  status: STATUS_FILTER_ALL,
  destination: "",
  periodStart: "",
  periodEnd: "",
};

/**
 * Tela de listagem de orçamentos: busca por texto e filtros por status,
 * destino e período, resolvidos no servidor via `listQuotesAction` (M5).
 */
export function QuoteListScreen() {
  const [filters, setFilters] = useState<Filters>(INITIAL_FILTERS);
  const [items, setItems] = useState<QuoteSummary[] | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadQuotes = useCallback(async (currentFilters: Filters) => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await listQuotesAction({
        search: currentFilters.search || undefined,
        status: currentFilters.status === STATUS_FILTER_ALL ? undefined : currentFilters.status,
        destination: currentFilters.destination || undefined,
        periodStart: currentFilters.periodStart || undefined,
        periodEnd: currentFilters.periodEnd || undefined,
      });
      setItems(result.items);
    } catch {
      setError("Não foi possível carregar a lista de orçamentos.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    const timeout = setTimeout(() => {
      void loadQuotes(filters);
    }, 250);
    return () => clearTimeout(timeout);
  }, [filters, loadQuotes]);

  const hasActiveFilters = useMemo(
    () =>
      filters.search !== "" ||
      filters.status !== STATUS_FILTER_ALL ||
      filters.destination !== "" ||
      filters.periodStart !== "" ||
      filters.periodEnd !== "",
    [filters],
  );

  return (
    <main className="bg-background min-h-full pb-16">
      <div className="snow-container flex flex-col gap-8 px-4 pt-6 sm:px-6">
        <Hero
          title="Orçamentos"
          subtitle="Acompanhe, busque e gerencie os orçamentos gerados para as agências."
        />

        <section
          aria-labelledby="quote-filters-heading"
          className="rounded-snow-card border-border bg-card shadow-snow-card border p-5 sm:p-6"
        >
          <h2 id="quote-filters-heading" className="sr-only">
            Filtros de busca
          </h2>
          <div className="snow-grid-2">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="quote-search">Buscar</Label>
              <Input
                id="quote-search"
                placeholder="Agência, consultor ou destino"
                value={filters.search}
                onChange={(event) => setFilters((prev) => ({ ...prev, search: event.target.value }))}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="quote-status">Status</Label>
              <Select
                value={filters.status}
                onValueChange={(value) =>
                  setFilters((prev) => ({ ...prev, status: value as StatusFilterValue }))
                }
              >
                <SelectTrigger id="quote-status" className="w-full">
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={STATUS_FILTER_ALL}>Todos</SelectItem>
                  {quoteStatusValues.map((status) => (
                    <SelectItem key={status} value={status}>
                      {quoteStatusLabels[status]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="quote-destination">Destino</Label>
              <Input
                id="quote-destination"
                placeholder="Ex.: Buenos Aires"
                value={filters.destination}
                onChange={(event) =>
                  setFilters((prev) => ({ ...prev, destination: event.target.value }))
                }
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label>Período da viagem</Label>
              <div className="flex items-center gap-2">
                <Input
                  type="date"
                  aria-label="Data inicial do período"
                  value={filters.periodStart}
                  onChange={(event) =>
                    setFilters((prev) => ({ ...prev, periodStart: event.target.value }))
                  }
                />
                <span className="text-muted-foreground text-sm">até</span>
                <Input
                  type="date"
                  aria-label="Data final do período"
                  value={filters.periodEnd}
                  onChange={(event) =>
                    setFilters((prev) => ({ ...prev, periodEnd: event.target.value }))
                  }
                />
              </div>
            </div>
          </div>

          {hasActiveFilters ? (
            <div className="mt-4">
              <Button type="button" variant="outline" size="sm" onClick={() => setFilters(INITIAL_FILTERS)}>
                Limpar filtros
              </Button>
            </div>
          ) : null}
        </section>

        <section aria-labelledby="quote-results-heading" className="flex flex-col gap-4">
          <h2 id="quote-results-heading" className="sr-only">
            Resultados
          </h2>

          {isLoading ? <LoadingState label="Carregando orçamentos…" /> : null}

          {!isLoading && error ? (
            <ErrorState
              description={error}
              onRetry={() => {
                void loadQuotes(filters);
              }}
            />
          ) : null}

          {!isLoading && !error && items && items.length === 0 ? (
            hasActiveFilters ? (
              <EmptyState
                title="Nenhum orçamento encontrado"
                description="Ajuste os filtros de busca e tente novamente."
                action={
                  <Button type="button" variant="outline" onClick={() => setFilters(INITIAL_FILTERS)}>
                    Limpar filtros
                  </Button>
                }
              />
            ) : (
              <EmptyState
                title="Você ainda não criou nenhum orçamento"
                description="Comece criando o primeiro orçamento para uma agência."
                action={
                  <Button
                    variant="snow-generate"
                    size="generate"
                    nativeButton={false}
                    render={<Link href="/orcamentos/novo" />}
                  >
                    + Novo orçamento
                  </Button>
                }
              />
            )
          ) : null}

          {!isLoading && !error && items && items.length > 0 ? (
            <ul className="flex flex-col gap-3">
              {items.map((quote) => (
                <li key={quote.id}>
                  <Link
                    href={`/orcamentos/${quote.id}`}
                    className="rounded-snow-card border-border bg-card shadow-snow-card hover:border-snow-blue focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-snow-blue flex flex-col gap-2 border p-5 transition-colors sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="flex flex-col gap-1">
                      <p className="text-foreground font-semibold">{quote.agency}</p>
                      <p className="text-muted-foreground text-sm">
                        {quote.destination} · Consultor: {quote.consultant}
                      </p>
                      <p className="text-muted-foreground text-xs">
                        {formatDate(quote.startDate)} – {formatDate(quote.endDate)}
                      </p>
                    </div>
                    <QuoteStatusBadge status={quote.status} />
                  </Link>
                </li>
              ))}
            </ul>
          ) : null}
        </section>
      </div>
    </main>
  );
}

function formatDate(isoDate: string): string {
  if (!isoDate) return "—";
  const [year, month, day] = isoDate.split("-");
  if (!year || !month || !day) return isoDate;
  return `${day}/${month}/${year}`;
}
