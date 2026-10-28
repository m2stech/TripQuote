import type { Metadata } from "next";
import { Suspense } from "react";

import { Hero } from "@/components/hero";
import { NewQuoteContent } from "@/features/quotes/components/NewQuoteContent";

export const metadata: Metadata = {
  title: "Novo orçamento — SnowQuote",
};

interface NewQuotePageProps {
  searchParams: Promise<{ duplicar?: string; id?: string }>;
}

async function NewQuoteContentServer({ searchParams }: NewQuotePageProps) {
  const { duplicar, id } = await searchParams;
  return <NewQuoteContent quoteId={id ?? duplicar} isDuplicating={Boolean(duplicar && !id)} />;
}

/**
 * Página de criação (ou edição, via `?duplicar=<id>`) de orçamento. Renderiza
 * o formulário completo; a geração via IA e o download do .pptx serão
 * implementados em marcos futuros (M6/M7).
 *
 * `?id=<id>` identifica o rascunho em andamento (escrito na URL pelo próprio
 * `QuoteForm` ao criar o primeiro rascunho, via `router.replace`) — evita
 * criar um novo registro em `quotes` a cada remontagem do componente (ex.:
 * duplo-mount do Strict Mode em dev, ou um F5 na página).
 */
export default function NewQuotePage({ searchParams }: NewQuotePageProps) {
  return (
    <main className="bg-background min-h-full pb-16">
      <div className="snow-container flex flex-col gap-8 px-4 pt-6 sm:px-6">
        <Hero
          title="Novo orçamento"
          subtitle="Preencha os dados abaixo para gerar o orçamento em .pptx."
        />
        <Suspense fallback={null}>
          <NewQuoteContentServer searchParams={searchParams} />
        </Suspense>
      </div>
    </main>
  );
}
