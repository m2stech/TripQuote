import type { Metadata } from "next";
import { Suspense } from "react";

import { getCurrentUserRole } from "@/lib/auth/get-current-user-role";
import { QuoteListScreen } from "@/features/quotes/components/QuoteListScreen";

export const metadata: Metadata = {
  title: "Orçamentos — SnowQuote",
};

async function QuotesListContent() {
  const role = await getCurrentUserRole();
  return <QuoteListScreen isAdmin={role === "admin"} />;
}

export default function QuotesListPage() {
  return (
    <Suspense fallback={null}>
      <QuotesListContent />
    </Suspense>
  );
}
