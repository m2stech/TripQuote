"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";

import { EmptyState } from "@/components/empty-state";
import { ErrorState } from "@/components/error-state";
import { Hero } from "@/components/hero";
import { LoadingState } from "@/components/loading-state";
import { Badge } from "@/components/ui/badge";
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
import {
  getCurrentUserRoleAction,
  listOperatorsAction,
  listQuotesAction,
} from "@/features/quotes/actions/quote-actions";
import { QuoteCommercialStatusBadge } from "@/features/quotes/components/QuoteCommercialStatusBadge";
import { QuoteStatusBadge } from "@/features/quotes/components/QuoteStatusBadge";
import type { OperatorOption } from "@/features/quotes/repository/types";
import { PRODUCT_TYPE_LABELS } from "@/features/prompts/schemas/product-type.schema";
import {
  commercialStatusLabels,
  commercialStatusValues,
  type CommercialStatus,
} from "@/features/quotes/schemas/commercial-status.schema";
import {
  quoteStatusLabels,
  quoteStatusValues,
  type QuoteStatus,
} from "@/features/quotes/schemas/quote.schema";
import type { QuoteSummary } from "@/features/quotes/schemas/quote.schema";

const STATUS_FILTER_ALL = "all" as const;
type StatusFilterValue = QuoteStatus | typeof STATUS_FILTER_ALL;

const COMMERCIAL_STATUS_FILTER_ALL = "all" as const;
type CommercialStatusFilterValue = CommercialStatus | typeof COMMERCIAL_STATUS_FILTER_ALL;

const VISIBILITY_MINE = "mine" as const;
const VISIBILITY_ALL = "all" as const;
type VisibilityFilterValue = typeof VISIBILITY_MINE | typeof VISIBILITY_ALL;

const OPERATOR_FILTER_ALL = "all" as const;
type OperatorFilterValue = string | typeof OPERATOR_FILTER_ALL;

interface Filters {
  search: string;
  status: StatusFilterValue;
  commercialStatus: CommercialStatusFilterValue;
  destination: string;
  periodStart: string;
  periodEnd: string;
  visibility: VisibilityFilterValue;
  operatorId: OperatorFilterValue;
}

const INITIAL_FILTERS: Filters = {
  search: "",
  status: STATUS_FILTER_ALL,
  commercialStatus: COMMERCIAL_STATUS_FILTER_ALL,
  destination: "",
  periodStart: "",
  periodEnd: "",
  visibility: VISIBILITY_MINE,
  operatorId: OPERATOR_FILTER_ALL,
};

/**
 * Tela de listagem de orçamentos: busca por texto e filtros por status,
 * destino e período, resolvidos no servidor via `listQuotesAction` (M5). O
 * papel do usuário é resolvido aqui no client (`getCurrentUserRoleAction`),
 * não recebido via prop do Server Component da página — ver comentário em
 * `(app)/orcamentos/page.tsx`. Admin tem um filtro de visibilidade ("apenas
 * as minhas", padrão, ou "todas as cotações"); consultor nunca vê orçamentos
 * de outro usuário, reforçado pela RLS de `quotes` independente deste filtro.
 */
export function QuoteListScreen() {
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [filters, setFilters] = useState<Filters>(INITIAL_FILTERS);
  const [items, setItems] = useState<QuoteSummary[] | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [operators, setOperators] = useState<OperatorOption[]>([]);

  useEffect(() => {
    let isActive = true;
    getCurrentUserRoleAction()
      .then((role) => {
        if (isActive) setIsAdmin(role === "admin");
      })
      .catch(() => {
        if (isActive) setIsAdmin(false);
      });
    return () => {
      isActive = false;
    };
  }, []);

  useEffect(() => {
    if (!isAdmin) return;
    let isActive = true;
    listOperatorsAction()
      .then((result) => {
        if (isActive) setOperators(result);
      })
      .catch(() => {
        if (isActive) setOperators([]);
      });
    return () => {
      isActive = false;
    };
  }, [isAdmin]);

  const loadQuotes = useCallback(
    async (currentFilters: Filters, currentIsAdmin: boolean | null) => {
      setIsLoading(true);
      setError(null);
      try {
        const result = await listQuotesAction({
          search: currentFilters.search || undefined,
          status: currentFilters.status === STATUS_FILTER_ALL ? undefined : currentFilters.status,
          commercialStatus:
            currentFilters.commercialStatus === COMMERCIAL_STATUS_FILTER_ALL
              ? undefined
              : currentFilters.commercialStatus,
          destination: currentFilters.destination || undefined,
          periodStart: currentFilters.periodStart || undefined,
          periodEnd: currentFilters.periodEnd || undefined,
          onlyMine: currentIsAdmin ? currentFilters.visibility === VISIBILITY_MINE : undefined,
          operatorId:
            currentIsAdmin && currentFilters.operatorId !== OPERATOR_FILTER_ALL
              ? currentFilters.operatorId
              : undefined,
        });
        setItems(result.items);
      } catch {
        setError("Não foi possível carregar a lista de orçamentos.");
      } finally {
        setIsLoading(false);
      }
    },
    [],
  );

  useEffect(() => {
    // Aguarda `isAdmin` ser resolvido (não-null) antes da primeira busca:
    // evita carregar a lista duas vezes (uma sem saber o papel, outra depois)
    // e garante que `onlyMine` já reflita o papel correto desde o início.
    if (isAdmin === null) return;
    const timeout = setTimeout(() => {
      void loadQuotes(filters, isAdmin);
    }, 250);
    return () => clearTimeout(timeout);
  }, [filters, isAdmin, loadQuotes]);

  const hasActiveFilters = useMemo(
    () =>
      filters.search !== "" ||
      filters.status !== STATUS_FILTER_ALL ||
      filters.commercialStatus !== COMMERCIAL_STATUS_FILTER_ALL ||
      filters.destination !== "" ||
      filters.periodStart !== "" ||
      filters.periodEnd !== "" ||
      filters.visibility !== VISIBILITY_MINE ||
      filters.operatorId !== OPERATOR_FILTER_ALL,
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
                onChange={(event) =>
                  setFilters((prev) => ({ ...prev, search: event.target.value }))
                }
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="quote-status">Status geração</Label>
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
              <Label htmlFor="quote-commercial-status">Status Cotação</Label>
              <Select
                value={filters.commercialStatus}
                onValueChange={(value) =>
                  setFilters((prev) => ({
                    ...prev,
                    commercialStatus: value as CommercialStatusFilterValue,
                  }))
                }
              >
                <SelectTrigger id="quote-commercial-status" className="w-full">
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={COMMERCIAL_STATUS_FILTER_ALL}>Todos</SelectItem>
                  {commercialStatusValues.map((status) => (
                    <SelectItem key={status} value={status}>
                      {commercialStatusLabels[status]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {isAdmin ? (
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="quote-visibility">Visibilidade</Label>
                <Select
                  value={filters.visibility}
                  onValueChange={(value) =>
                    setFilters((prev) => ({ ...prev, visibility: value as VisibilityFilterValue }))
                  }
                >
                  <SelectTrigger id="quote-visibility" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={VISIBILITY_MINE}>Apenas as minhas</SelectItem>
                    <SelectItem value={VISIBILITY_ALL}>Todas as cotações</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            ) : null}

            {isAdmin ? (
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="quote-operator">Operador</Label>
                <Select
                  value={filters.operatorId}
                  onValueChange={(value) =>
                    setFilters((prev) => ({
                      ...prev,
                      operatorId: value as OperatorFilterValue,
                      // Filtrar por um operador específico só surte efeito
                      // com "Todas as cotações" — "Apenas as minhas" sempre
                      // sobrescreveria o filtro para o próprio admin.
                      visibility: value === OPERATOR_FILTER_ALL ? prev.visibility : VISIBILITY_ALL,
                    }))
                  }
                >
                  <SelectTrigger id="quote-operator" className="w-full">
                    <SelectValue placeholder="Todos" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={OPERATOR_FILTER_ALL}>Todos</SelectItem>
                    {operators.map((operator) => (
                      <SelectItem key={operator.id} value={operator.id}>
                        {operator.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ) : null}

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
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setFilters(INITIAL_FILTERS)}
              >
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
                void loadQuotes(filters, isAdmin);
              }}
            />
          ) : null}

          {!isLoading && !error && items && items.length === 0 ? (
            hasActiveFilters ? (
              <EmptyState
                title="Nenhum orçamento encontrado"
                description="Ajuste os filtros de busca e tente novamente."
                action={
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setFilters(INITIAL_FILTERS)}
                  >
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
                    className="rounded-snow-card border-border bg-card shadow-snow-card hover:border-snow-blue focus-visible:outline-snow-blue flex flex-col gap-2 border p-5 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center gap-2">
                        <p className="text-foreground font-semibold">{quote.agency}</p>
                        <Badge variant="outline">{PRODUCT_TYPE_LABELS[quote.productType]}</Badge>
                        <QuoteStatusBadge status={quote.status} />
                      </div>
                      <p className="text-muted-foreground text-sm">
                        {quote.destination} · Consultor: {quote.consultant}
                      </p>
                      <p className="text-muted-foreground text-xs">
                        {formatDate(quote.startDate)} – {formatDate(quote.endDate)}
                      </p>
                      <p className="text-muted-foreground text-xs">
                        Criado por {quote.createdByName} em {formatDateTime(quote.createdAt)}
                      </p>
                    </div>
                    <QuoteCommercialStatusBadge status={quote.commercialStatus} />
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

function formatDateTime(isoDateTime: string): string {
  const date = new Date(isoDateTime);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}
