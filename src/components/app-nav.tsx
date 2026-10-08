"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { Button } from "@/components/ui/button";
import { logout } from "@/features/auth/actions/logout";
import { cn } from "@/lib/utils";

const NAV_LINKS = [
  { href: "/orcamentos", label: "Orçamentos" },
  { href: "/orcamentos/novo", label: "Novo orçamento" },
  { href: "/admin", label: "Admin" },
  { href: "/minha-conta", label: "Minha conta" },
] as const;

/**
 * Navegação da área autenticada, no padrão SNOW (navy/azul/laranja). Vira
 * header fixo no topo; em telas estreitas os links quebram em nova linha.
 */
export function AppNav() {
  const pathname = usePathname();

  return (
    <header className="border-b border-snow-line bg-snow-navy text-white">
      <div className="snow-container flex flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6">
        <div className="flex items-center gap-6">
          <Link href="/orcamentos" className="text-lg font-semibold tracking-tight">
            TripQuote
          </Link>
          <nav aria-label="Navegação principal" className="flex flex-wrap items-center gap-1">
            {NAV_LINKS.map((link) => {
              const isActive =
                link.href === "/orcamentos"
                  ? pathname === "/orcamentos"
                  : pathname.startsWith(link.href);
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  aria-current={isActive ? "page" : undefined}
                  className={cn(
                    "rounded-[9px] px-3 py-1.5 text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white",
                    isActive ? "bg-white/15 text-white" : "text-white/80 hover:bg-white/10 hover:text-white",
                  )}
                >
                  {link.label}
                </Link>
              );
            })}
          </nav>
        </div>

        <form action={logout}>
          <Button
            type="submit"
            variant="ghost"
            size="sm"
            className="text-white hover:bg-white/10 hover:text-white"
          >
            Sair
          </Button>
        </form>
      </div>
    </header>
  );
}
