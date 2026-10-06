import type { Metadata } from "next";

import { AdminPlaceholder } from "@/components/admin-placeholder";

export const metadata: Metadata = {
  title: "Identidade visual — Administração — TripQuote",
};

export default function AdminBrandingPage() {
  return (
    <AdminPlaceholder
      title="Identidade visual"
      description="Gestão de logos institucionais e demais ativos de marca da SNOW."
      milestone="M8"
    />
  );
}
