"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/utils";

const ADMIN_LINKS = [
  { href: "/admin/usuarios", label: "Usuários" },
  { href: "/admin/prompts", label: "Prompts" },
  { href: "/admin/identidade-visual", label: "Identidade visual" },
  { href: "/admin/consumo", label: "Consumo" },
] as const;

/**
 * Navegação secundária da área admin (esqueleto do M3; a implementação
 * completa de cada tela é do M8).
 */
export function AdminNav() {
  const pathname = usePathname();

  return (
    <nav aria-label="Navegação de administração" className="flex flex-wrap gap-1">
      {ADMIN_LINKS.map((link) => {
        const isActive = pathname.startsWith(link.href);
        return (
          <Link
            key={link.href}
            href={link.href}
            aria-current={isActive ? "page" : undefined}
            className={cn(
              "rounded-[9px] px-3 py-1.5 text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-snow-blue",
              isActive
                ? "bg-snow-secondary-bg text-snow-secondary-fg"
                : "text-muted-foreground hover:bg-snow-secondary-bg/60 hover:text-snow-secondary-fg",
            )}
          >
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}
