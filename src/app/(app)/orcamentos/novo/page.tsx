import type { Metadata } from "next";

import { Hero } from "@/components/hero";
import { QuoteForm } from "@/features/quotes/components/QuoteForm";

export const metadata: Metadata = {
  title: "Novo orçamento — TripQuote",
};

/**
 * Página de criação de orçamento (M2). Renderiza o formulário completo;
 * a geração via IA e o download do .pptx serão implementados em marcos
 * futuros (M6/M7).
 */
export default function NewQuotePage() {
  return (
    <main className="bg-background min-h-full pb-16">
      <div className="snow-container flex flex-col gap-8 px-4 pt-6 sm:px-6">
        <Hero
          title="Novo orçamento"
          subtitle="Preencha os dados abaixo para gerar o orçamento em .pptx."
          logoSlot={<span className="text-snow-navy text-sm font-semibold">LOGO SNOW</span>}
        />
        <QuoteForm />
      </div>
    </main>
  );
}
