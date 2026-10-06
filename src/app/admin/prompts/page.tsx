import type { Metadata } from "next";

import { AdminPlaceholder } from "@/components/admin-placeholder";

export const metadata: Metadata = {
  title: "Prompts — Administração — TripQuote",
};

export default function AdminPromptsPage() {
  return (
    <AdminPlaceholder
      title="Prompts"
      description="Editor de prompt com versionamento: nova versão, ativação, histórico e restauração."
      milestone="M8"
    />
  );
}
