import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

interface SectionCardProps {
  /** Número de ordem da seção (ex.: "01"). Exibido em laranja antes do título. */
  number: string | number;
  /** Título da seção (ex.: "Dados gerais"). */
  title: string;
  /** Texto de apoio opcional, exibido abaixo do título. */
  description?: string;
  children: ReactNode;
  className?: string;
}

/**
 * Card de seção numerada do formulário de orçamento, no padrão SNOW:
 * card branco, raio 15px, borda sutil, sombra leve e número em laranja
 * antes do título (ex.: "01 Dados gerais").
 */
export function SectionCard({ number, title, description, children, className }: SectionCardProps) {
  const formattedNumber = typeof number === "number" ? String(number).padStart(2, "0") : number;
  const headingId = `section-${formattedNumber}-heading`;

  return (
    <section
      aria-labelledby={headingId}
      className={cn(
        "rounded-snow-card border-border bg-card shadow-snow-card border p-5 sm:p-6",
        className,
      )}
    >
      <header className="mb-4 flex flex-col gap-1">
        <h2
          id={headingId}
          className="text-foreground flex items-baseline gap-2 text-lg font-semibold"
        >
          <span aria-hidden="true" className="text-snow-orange font-bold">
            {formattedNumber}
          </span>
          <span>{title}</span>
        </h2>
        {description ? <p className="text-muted-foreground text-sm">{description}</p> : null}
      </header>
      <div className="flex flex-col gap-4">{children}</div>
    </section>
  );
}
