import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

interface EmptyStateProps {
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}

/**
 * Estado vazio padrão (ex.: lista sem resultados). Use em qualquer tela que
 * possa não ter dados a exibir, com texto em pt-BR.
 */
export function EmptyState({ title, description, action, className }: EmptyStateProps) {
  return (
    <div
      className={cn(
        "border-border bg-card rounded-snow-card flex flex-col items-center gap-3 border p-10 text-center",
        className,
      )}
    >
      <p className="text-foreground text-base font-semibold">{title}</p>
      {description ? <p className="text-muted-foreground max-w-sm text-sm">{description}</p> : null}
      {action ? <div className="mt-1">{action}</div> : null}
    </div>
  );
}
