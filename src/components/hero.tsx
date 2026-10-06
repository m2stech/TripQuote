import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

interface HeroProps {
  /** Área da logo SNOW, normalmente uma imagem sobre um painel branco. */
  logoSlot?: ReactNode;
  title: string;
  subtitle?: string;
  className?: string;
}

/**
 * Cabeçalho (hero) do padrão SNOW: gradiente navy → azul petróleo a 115°,
 * raio de 10px e um painel branco para a logo da operadora.
 */
export function Hero({ logoSlot, title, subtitle, className }: HeroProps) {
  return (
    <header
      className={cn(
        "rounded-snow-hero flex flex-col gap-4 p-6 text-white sm:flex-row sm:items-center sm:justify-between sm:p-8",
        className,
      )}
      style={{
        background: "linear-gradient(115deg, var(--snow-hero-start), var(--snow-hero-end))",
      }}
    >
      <div className="flex flex-col gap-1">
        <h1 className="text-xl font-semibold sm:text-2xl">{title}</h1>
        {subtitle ? <p className="text-sm text-white/80">{subtitle}</p> : null}
      </div>
      {logoSlot ? (
        <div className="shadow-snow-card flex h-14 w-32 shrink-0 items-center justify-center rounded-[9px] bg-white p-2">
          {logoSlot}
        </div>
      ) : null}
    </header>
  );
}
