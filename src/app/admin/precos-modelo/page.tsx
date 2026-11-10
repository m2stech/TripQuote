import type { Metadata } from "next";

import { ModelPricingSection } from "@/features/usage/components/ModelPricingSection";

export const metadata: Metadata = {
  title: "Preços por modelo — Administração — SnowQuote",
};

// Os dados são carregados no client (ver `ModelPricingSection`), não aqui —
// mesma razão de `admin/usuarios/page.tsx` (Cache Components/Next 16).
export default function AdminModelPricingPage() {
  return <ModelPricingSection />;
}
