import type { Metadata } from "next";

import { PromptVersionManagementScreen } from "@/features/prompts/components/PromptVersionManagementScreen";

export const metadata: Metadata = {
  title: "Prompts — Administração — TripQuote",
};

// A lista é carregada no client (ver `PromptVersionManagementScreen`), não
// aqui — mesma razão de `admin/usuarios/page.tsx` (Cache Components/Next 16).
export default function AdminPromptsPage() {
  return <PromptVersionManagementScreen />;
}
