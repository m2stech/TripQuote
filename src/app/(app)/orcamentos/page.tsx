import type { Metadata } from "next";

import { getCurrentUserRole } from "@/lib/auth/get-current-user-role";
import { QuoteListScreen } from "@/features/quotes/components/QuoteListScreen";

export const metadata: Metadata = {
  title: "Orçamentos — SnowQuote",
};

export default async function QuotesListPage() {
  const role = await getCurrentUserRole();
  return <QuoteListScreen isAdmin={role === "admin"} />;
}
