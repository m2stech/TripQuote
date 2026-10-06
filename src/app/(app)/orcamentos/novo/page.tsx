import type { Metadata } from "next";
import { Suspense } from "react";

import { Hero } from "@/components/hero";
import { QuoteForm } from "@/features/quotes/components/QuoteForm";

export const metadata: Metadata = {
  title: "Novo orçamento — TripQuote",
};

interface NewQuotePageProps {
  searchParams: Promise<{ duplicar?: string }>;
}

async function NewQuoteContent({ searchParams }: NewQuotePageProps) {
  const { duplicar } = await searchParams;
  return <QuoteForm duplicateFromId={duplicar} />;
}

/**
 * Página de criação (ou edição, via `?duplicar=<id>`) de orçamento. Renderiza
 * o formulário completo; a geração via IA e o download do .pptx serão
 * implementados em marcos futuros (M6/M7).
 */
export default function NewQuotePage({ searchParams }: NewQuotePageProps) {
  return (
    <main className="bg-background min-h-full pb-16">
      <div className="snow-container flex flex-col gap-8 px-4 pt-6 sm:px-6">
        <Hero
          title="Novo orçamento"
          subtitle="Preencha os dados abaixo para gerar o orçamento em .pptx."
          logoSlot={<span className="text-snow-navy text-sm font-semibold">LOGO SNOW</span>}
        />
        <Suspense fallback={null}>
          <NewQuoteContent searchParams={searchParams} />
        </Suspense>
      </div>
    </main>
  );
}
