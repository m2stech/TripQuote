import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

interface TwoColumnGridProps {
  children: ReactNode;
  className?: string;
}

/**
 * Grid de duas colunas que colapsa para uma coluna em telas de até 650px,
 * seguindo o padrão de layout do protótipo SNOW. Para breakpoints
 * arbitrários fora deste componente, use a classe utilitária `snow-grid-2`
 * definida em `globals.css`.
 */
export function TwoColumnGrid({ children, className }: TwoColumnGridProps) {
  return <div className={cn("snow-grid-2", className)}>{children}</div>;
}
