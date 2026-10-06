import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

interface InfoBoxProps {
  children: ReactNode;
  className?: string;
}

/**
 * Bloco informativo fixo do padrão SNOW: fundo claro e borda esquerda azul de
 * destaque. Use para notas fixas, instruções ou contexto que não é um aviso
 * (para avisos, use `Alert` com `variant="warning"`).
 */
export function InfoBox({ children, className }: InfoBoxProps) {
  return (
    <div
      role="note"
      className={cn(
        "border-l-primary bg-snow-info-bg text-foreground rounded-[9px] border-l-4 px-4 py-3 text-sm",
        className,
      )}
    >
      {children}
    </div>
  );
}
