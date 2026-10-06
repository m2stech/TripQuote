"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

import { EmptyState } from "@/components/empty-state";
import { ErrorState } from "@/components/error-state";
import { Hero } from "@/components/hero";
import { LoadingState } from "@/components/loading-state";
import { SectionCard } from "@/components/section-card";
import { Button } from "@/components/ui/button";
import {
  duplicateQuoteAction,
  getQuoteAction,
  regenerateQuoteAction,
} from "@/features/quotes/actions/quote-actions";
import { QuoteStatusBadge } from "@/features/quotes/components/QuoteStatusBadge";
import type { QuoteRecord } from "@/features/quotes/schemas/quote.schema";

interface QuoteDetailScreenProps {
  quoteId: string;
}

/**
 * Tela de detalhe de um orçamento: dados principais e ações Duplicar, Editar
 * e Regenerar, via Server Actions (M5). A geração real por IA chega no M6.
 */
export function QuoteDetailScreen({ quoteId }: QuoteDetailScreenProps) {
  const router = useRouter();
  const [quote, setQuote] = useState<QuoteRecord | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [isDuplicating, setIsDuplicating] = useState(false);

  const loadQuote = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const record = await getQuoteAction(quoteId);
      setQuote(record);
    } catch {
      setError("Não foi possível carregar os dados deste orçamento.");
    } finally {
      setIsLoading(false);
    }
  }, [quoteId]);

  useEffect(() => {
    const timeout = setTimeout(() => {
      void loadQuote();
    }, 0);
    return () => clearTimeout(timeout);
  }, [loadQuote]);

  async function handleDuplicate() {
    setIsDuplicating(true);
    try {
      const copy = await duplicateQuoteAction(quoteId);
      toast.success("Orçamento duplicado com sucesso.");
      router.push(`/orcamentos/${copy.id}`);
    } catch {
      toast.error("Não foi possível duplicar o orçamento.");
    } finally {
      setIsDuplicating(false);
    }
  }

  async function handleRegenerate() {
    setIsRegenerating(true);
    try {
      // Reflete o estado "processing" imediatamente na tela.
      setQuote((prev) => (prev ? { ...prev, status: "processing", errorMessage: undefined } : prev));
      const updated = await regenerateQuoteAction(quoteId);
      setQuote(updated);
      if (updated.status === "error") {
        toast.error(updated.errorMessage ?? "Falha ao gerar o orçamento.");
      } else {
        toast.success("Orçamento gerado com sucesso.");
      }
    } catch {
      toast.error("Não foi possível iniciar a geração.");
      await loadQuote();
    } finally {
      setIsRegenerating(false);
    }
  }

  return (
    <main className="bg-background min-h-full pb-16">
      <div className="snow-container flex flex-col gap-8 px-4 pt-6 sm:px-6">
        <Hero
          title="Detalhe do orçamento"
          subtitle={quote ? `${quote.form.general.agency} · ${quote.form.general.destination}` : undefined}
        />

        {isLoading ? <LoadingState label="Carregando orçamento…" /> : null}

        {!isLoading && error ? <ErrorState description={error} onRetry={() => void loadQuote()} /> : null}

        {!isLoading && !error && !quote ? (
          <EmptyState
            title="Orçamento não encontrado"
            description="Ele pode ter sido removido ou o link está incorreto."
            action={
              <Button variant="outline" nativeButton={false} render={<Link href="/orcamentos" />}>
                Voltar para orçamentos
              </Button>
            }
          />
        ) : null}

        {!isLoading && !error && quote ? (
          <>
            <SectionCard number={1} title="Dados gerais">
              <div className="flex flex-wrap items-center gap-3">
                <QuoteStatusBadge status={quote.status} />
                {isRegenerating ? (
                  <span className="text-muted-foreground text-sm">Gerando novo conteúdo…</span>
                ) : null}
              </div>

              {quote.status === "error" && quote.errorMessage ? (
                <ErrorState
                  title="A última geração falhou"
                  description={quote.errorMessage}
                  onRetry={handleRegenerate}
                  retryLabel="Tentar gerar novamente"
                />
              ) : null}

              <dl className="snow-grid-2 text-sm">
                <DetailItem label="Agência" value={quote.form.general.agency} />
                <DetailItem label="Consultor" value={quote.form.general.consultant || "—"} />
                <DetailItem label="Destino" value={quote.form.general.destination} />
                <DetailItem
                  label="Período"
                  value={`${formatDate(quote.form.general.startDate)} – ${formatDate(quote.form.general.endDate)}`}
                />
                <DetailItem label="Viajantes" value={quote.form.general.travelers || "—"} />
                <DetailItem label="Moeda" value={quote.form.general.currency} />
                <DetailItem label="Tipo de valor" value={quote.form.general.priceType} />
                <DetailItem label="Base de acomodação" value={quote.form.general.occupancy || "—"} />
              </dl>
            </SectionCard>

            <SectionCard number={2} title="Hotéis" description="Hotéis incluídos neste orçamento.">
              {quote.form.hotels.length === 0 ? (
                <p className="text-muted-foreground text-sm">Nenhum hotel adicionado.</p>
              ) : (
                <ul className="flex flex-col gap-2">
                  {quote.form.hotels.map((hotel) => (
                    <li key={hotel.id} className="border-snow-input-border rounded-[9px] border p-3 text-sm">
                      <p className="text-foreground font-medium">{hotel.name}</p>
                      <p className="text-muted-foreground">{hotel.mealPlan}</p>
                    </li>
                  ))}
                </ul>
              )}
            </SectionCard>

            <SectionCard number={3} title="Ações">
              <div className="flex flex-wrap gap-3">
                <Button
                  type="button"
                  variant="snow-generate"
                  onClick={handleRegenerate}
                  disabled={isRegenerating || quote.status === "processing"}
                >
                  {isRegenerating || quote.status === "processing" ? "Gerando…" : "Regenerar"}
                </Button>
                <Button
                  variant="outline"
                  nativeButton={false}
                  render={<Link href={`/orcamentos/novo?duplicar=${quote.id}`} />}
                >
                  Editar
                </Button>
                <Button
                  type="button"
                  variant="snow-secondary"
                  onClick={handleDuplicate}
                  disabled={isDuplicating}
                >
                  {isDuplicating ? "Duplicando…" : "Duplicar"}
                </Button>
              </div>
            </SectionCard>
          </>
        ) : null}
      </div>
    </main>
  );
}

function DetailItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-0.5">
      <dt className="text-muted-foreground text-xs">{label}</dt>
      <dd className="text-foreground font-medium">{value}</dd>
    </div>
  );
}

function formatDate(isoDate: string): string {
  if (!isoDate) return "—";
  const [year, month, day] = isoDate.split("-");
  if (!year || !month || !day) return isoDate;
  return `${day}/${month}/${year}`;
}
