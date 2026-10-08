import type { Metadata } from "next";

import { UsageManagementScreen } from "@/features/usage/components/UsageManagementScreen";

export const metadata: Metadata = {
  title: "Consumo — Administração — SnowQuote",
};

// Os dados são carregados no client (ver `UsageManagementScreen`), não
// aqui — mesma razão de `admin/usuarios/page.tsx` (Cache Components/Next 16).
export default function AdminUsagePage() {
  return <UsageManagementScreen />;
}
