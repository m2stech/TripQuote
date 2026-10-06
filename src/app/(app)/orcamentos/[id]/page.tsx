import type { Metadata } from "next";
import { Suspense } from "react";

import { QuoteDetailScreen } from "@/features/quotes/components/QuoteDetailScreen";

export const metadata: Metadata = {
  title: "Detalhe do orçamento — TripQuote",
};

interface QuoteDetailPageProps {
  params: Promise<{ id: string }>;
}

async function QuoteDetailContent({ params }: QuoteDetailPageProps) {
  const { id } = await params;
  return <QuoteDetailScreen quoteId={id} />;
}

// `params` só resolve em runtime (dado dinâmico por usuário); precisa de
// Suspense para não bloquear o pré-render estático do shell da página.
export default function QuoteDetailPage({ params }: QuoteDetailPageProps) {
  return (
    <Suspense fallback={null}>
      <QuoteDetailContent params={params} />
    </Suspense>
  );
}
