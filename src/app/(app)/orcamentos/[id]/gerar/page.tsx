import type { Metadata } from "next";
import { Suspense } from "react";

import { GenerationProgressScreen } from "@/features/quotes/components/GenerationProgressScreen";

export const metadata: Metadata = {
  title: "Gerando orçamento — TripQuote",
};

// A geração via IA (busca web + redação) pode levar bem mais que o padrão da
// plataforma; a Server Action chamada por esta página aguarda o resultado
// completo (sem polling), então precisa do tempo máximo disponível.
export const maxDuration = 300;

interface GenerateQuotePageProps {
  params: Promise<{ id: string }>;
}

async function GenerateQuoteContent({ params }: GenerateQuotePageProps) {
  const { id } = await params;
  return <GenerationProgressScreen quoteId={id} />;
}

// `params` só resolve em runtime (dado dinâmico por usuário); precisa de
// Suspense para não bloquear o pré-render estático do shell da página.
export default function GenerateQuotePage({ params }: GenerateQuotePageProps) {
  return (
    <Suspense fallback={null}>
      <GenerateQuoteContent params={params} />
    </Suspense>
  );
}
