import type { Metadata } from "next";

import { QuoteDetailScreen } from "@/features/quotes/components/QuoteDetailScreen";

export const metadata: Metadata = {
  title: "Detalhe do orçamento — TripQuote",
};

interface QuoteDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function QuoteDetailPage({ params }: QuoteDetailPageProps) {
  const { id } = await params;
  return <QuoteDetailScreen quoteId={id} />;
}
