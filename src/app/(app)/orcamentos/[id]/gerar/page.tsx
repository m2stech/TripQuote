import type { Metadata } from "next";
import { Suspense } from "react";

import { GenerationProgressScreen } from "@/features/quotes/components/GenerationProgressScreen";

export const metadata: Metadata = {
  title: "Gerando orçamento — TripQuote",
};

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
