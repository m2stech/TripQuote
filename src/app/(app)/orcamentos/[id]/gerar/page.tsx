import type { Metadata } from "next";

import { GenerationProgressScreen } from "@/features/quotes/components/GenerationProgressScreen";

export const metadata: Metadata = {
  title: "Gerando orçamento — TripQuote",
};

interface GenerateQuotePageProps {
  params: Promise<{ id: string }>;
}

export default async function GenerateQuotePage({ params }: GenerateQuotePageProps) {
  const { id } = await params;
  return <GenerationProgressScreen quoteId={id} />;
}
