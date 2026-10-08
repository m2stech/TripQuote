import type { Metadata } from "next";
import Link from "next/link";

import { SectionCard } from "@/components/section-card";

export const metadata: Metadata = {
  title: "Administração — SnowQuote",
};

const ADMIN_SECTIONS = [
  {
    href: "/admin/usuarios",
    title: "Usuários",
    description: "Convide, ative/desative e defina o papel de cada usuário.",
  },
  {
    href: "/admin/prompts",
    title: "Prompts",
    description: "Versione o prompt usado na geração via IA.",
  },
  {
    href: "/admin/identidade-visual",
    title: "Identidade visual",
    description: "Gerencie logos institucionais e ativos de marca.",
  },
  {
    href: "/admin/consumo",
    title: "Consumo",
    description: "Acompanhe tokens, custo estimado e auditoria de geração.",
  },
] as const;

export default function AdminIndexPage() {
  return (
    <div className="snow-grid-2">
      {ADMIN_SECTIONS.map((section, index) => (
        <Link key={section.href} href={section.href} className="focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-snow-blue rounded-snow-card">
          <SectionCard number={index + 1} title={section.title} description={section.description}>
            <span className="text-snow-blue text-sm font-medium">Acessar →</span>
          </SectionCard>
        </Link>
      ))}
    </div>
  );
}
