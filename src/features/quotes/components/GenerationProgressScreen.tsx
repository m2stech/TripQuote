"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

import { ErrorState } from "@/components/error-state";
import { Hero } from "@/components/hero";
import { SectionCard } from "@/components/section-card";
import { Button } from "@/components/ui/button";
import { getQuoteRepository } from "@/features/quotes/repository";
import { QuoteStatusBadge } from "@/features/quotes/components/QuoteStatusBadge";
import type { QuoteStatus } from "@/features/quotes/schemas/quote.schema";

interface GenerationProgressScreenProps {
  quoteId: string;
}

/**
 * Tela de progresso da geração (M3): simula o ciclo `processing` → `done` |
 * `error` usando o repositório mock. No M6, o status virá do backend via
 * polling/Realtime, mas os três estados visuais (carregando, erro, sucesso)
 * já ficam definidos aqui.
 */
export function GenerationProgressScreen({ quoteId }: GenerationProgressScreenProps) {
  const [status, setStatus] = useState<QuoteStatus>("processing");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const startGeneration = useCallback(async () => {
    setStatus("processing");
    setErrorMessage(null);
    try {
      const repository = getQuoteRepository();
      const result = await repository.regenerate(quoteId);
      setStatus(result.status);
      setErrorMessage(result.errorMessage ?? null);
    } catch {
      setStatus("error");
      setErrorMessage("Não foi possível iniciar a geração. Tente novamente.");
    }
  }, [quoteId]);

  useEffect(() => {
    const timeout = setTimeout(() => {
      void startGeneration();
    }, 0);
    return () => clearTimeout(timeout);
  }, [startGeneration]);

  return (
    <main className="bg-background min-h-full pb-16">
      <div className="snow-container flex flex-col gap-8 px-4 pt-6 sm:px-6">
        <Hero title="Gerando orçamento" subtitle="Acompanhe o andamento da geração em .pptx." />

        <SectionCard number={1} title="Status da geração">
          <div className="flex flex-col items-center gap-4 py-6 text-center">
            <QuoteStatusBadge status={status} />

            {status === "processing" ? (
              <>
                <div
                  role="status"
                  aria-live="polite"
                  className="border-snow-blue size-10 animate-spin rounded-full border-4 border-t-transparent"
                />
                <p className="text-muted-foreground text-sm">
                  Estamos montando o seu orçamento. Isso pode levar alguns instantes…
                </p>
              </>
            ) : null}

            {status === "done" ? (
              <>
                <p className="text-foreground text-base font-semibold">Orçamento gerado com sucesso!</p>
                <div className="flex flex-wrap justify-center gap-3">
                  <Button variant="snow-generate" size="generate" disabled>
                    Baixar .pptx (em breve)
                  </Button>
                  <Button variant="outline" render={<Link href={`/orcamentos/${quoteId}`} />}>
                    Ver detalhe do orçamento
                  </Button>
                </div>
              </>
            ) : null}

            {status === "error" ? (
              <div className="w-full max-w-md">
                <ErrorState
                  title="Não foi possível gerar o orçamento"
                  description={errorMessage ?? "Ocorreu um erro inesperado. Tente novamente."}
                  onRetry={() => void startGeneration()}
                />
              </div>
            ) : null}
          </div>
        </SectionCard>
      </div>
    </main>
  );
}
