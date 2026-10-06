import type { Metadata } from "next";

import { AdminPlaceholder } from "@/components/admin-placeholder";

export const metadata: Metadata = {
  title: "Usuários — Administração — TripQuote",
};

export default function AdminUsersPage() {
  return (
    <AdminPlaceholder
      title="Usuários"
      description="Convidar, ativar/desativar e alterar o papel (consultor ou admin) de cada usuário."
      milestone="M8"
    />
  );
}
