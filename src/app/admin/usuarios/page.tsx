import type { Metadata } from "next";

import { UserManagementScreen } from "@/features/users/components/UserManagementScreen";

export const metadata: Metadata = {
  title: "Usuários — Administração — SnowQuote",
};

// A lista é carregada no client (ver `UserManagementScreen`), não aqui: uma
// Server Action chamada direto no Server Component força a página inteira a
// virar dinâmica sob Cache Components (Next 16), o que já causou o erro
// "Next.js encountered the unstable value `Date.now()` while prerendering"
// nesta rota. Mesmo padrão de `QuoteListScreen`/`(app)/orcamentos/page.tsx`.
export default function AdminUsersPage() {
  return <UserManagementScreen />;
}
