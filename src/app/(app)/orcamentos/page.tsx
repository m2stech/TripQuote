import type { Metadata } from "next";

import { QuoteListScreen } from "@/features/quotes/components/QuoteListScreen";

export const metadata: Metadata = {
  title: "Orçamentos — SnowQuote",
};

// O papel do usuário (admin vs. consultor) é resolvido no client, dentro de
// `QuoteListScreen` — nunca aqui no Server Component. Chamar uma função que
// acessa dados dinâmicos (cookies + consulta ao Supabase) direto na página,
// mesmo com `<Suspense>`, já causou "Next.js encountered the unstable value
// `Date.now()` while prerendering" sob Cache Components (Next 16). Mesmo
// padrão de `AdminUsersPage`/`UserManagementScreen`.
export default function QuotesListPage() {
  return <QuoteListScreen />;
}
