import { Loader2 } from "lucide-react";

interface LoadingStateProps {
  label?: string;
}

/**
 * Indicador de carregamento padrão, usado enquanto o repositório mock
 * simula latência de rede (ver `features/quotes/repository`).
 */
export function LoadingState({ label = "Carregando…" }: LoadingStateProps) {
  return (
    <div role="status" className="text-muted-foreground flex items-center justify-center gap-2 p-10 text-sm">
      <Loader2 className="size-4 animate-spin" aria-hidden="true" />
      <span>{label}</span>
    </div>
  );
}
