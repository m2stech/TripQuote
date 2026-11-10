import type { Metadata } from "next";

import { AiUsageSection } from "@/features/usage/components/AiUsageSection";

export const metadata: Metadata = {
  title: "Consumo — Administração — SnowQuote",
};

// Os dados são carregados no client (ver `AiUsageSection`), não aqui —
// mesma razão de `admin/usuarios/page.tsx` (Cache Components/Next 16).
export default function AdminUsagePage() {
  return <AiUsageSection />;
}
