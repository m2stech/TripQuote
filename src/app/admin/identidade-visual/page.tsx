import type { Metadata } from "next";

import { BrandingSettingsScreen } from "@/features/branding/components/BrandingSettingsScreen";

export const metadata: Metadata = {
  title: "Identidade visual — Administração — TripQuote",
};

// Os dados são carregados no client (ver `BrandingSettingsScreen`), não
// aqui — mesma razão de `admin/usuarios/page.tsx` (Cache Components/Next 16).
export default function AdminBrandingPage() {
  return <BrandingSettingsScreen />;
}
