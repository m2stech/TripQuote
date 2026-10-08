import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { DesignShowcase } from "./design-showcase";

export const metadata: Metadata = {
  title: "Design system SNOW — SnowQuote",
  robots: { index: false, follow: false },
};

/**
 * Página de comparação visual do design system SNOW (M1).
 *
 * Decisão de escopo: a rota só é renderizada em desenvolvimento
 * (`NODE_ENV !== "production"`); em produção ela responde 404 via
 * `notFound()`. Isso evita expor uma tela interna de QA de componentes aos
 * usuários finais sem precisar de autenticação ou de uma allowlist de rotas
 * no middleware — a rota continua existindo no build, mas não é acessível.
 */
export default function DesignSystemPage() {
  if (process.env.NODE_ENV === "production") {
    notFound();
  }

  return <DesignShowcase />;
}
