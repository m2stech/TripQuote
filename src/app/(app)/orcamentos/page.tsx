import type { Metadata } from "next";

import { QuoteListScreen } from "@/features/quotes/components/QuoteListScreen";

export const metadata: Metadata = {
  title: "Orçamentos — SnowQuote",
};

export default function QuotesListPage() {
  return <QuoteListScreen />;
}
