import type { Metadata } from "next";

import { AdminPlaceholder } from "@/components/admin-placeholder";

export const metadata: Metadata = {
  title: "Consumo — Administração — TripQuote",
};

export default function AdminUsagePage() {
  return (
    <AdminPlaceholder
      title="Consumo"
      description="Painel de consumo de IA por usuário, período e orçamento, com auditoria e exportação CSV."
      milestone="M9"
    />
  );
}
