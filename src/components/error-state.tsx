import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";

interface ErrorStateProps {
  title?: string;
  description?: string;
  onRetry?: () => void;
  retryLabel?: string;
  /** Ação secundária opcional (ex.: "Editar orçamento"), renderizada ao lado do retry. */
  extraAction?: React.ReactNode;
}

/**
 * Estado de erro padrão (ex.: falha ao carregar dados do repositório).
 * Usa o `Alert` destrutivo do design system, com texto em pt-BR.
 */
export function ErrorState({
  title = "Não foi possível carregar os dados",
  description = "Ocorreu um erro inesperado. Tente novamente em alguns instantes.",
  onRetry,
  retryLabel = "Tentar novamente",
  extraAction,
}: ErrorStateProps) {
  return (
    <Alert variant="destructive" role="alert">
      <AlertTitle>{title}</AlertTitle>
      <AlertDescription>
        <p>{description}</p>
        {onRetry || extraAction ? (
          <div className="mt-3 flex flex-wrap gap-2">
            {onRetry ? (
              <Button type="button" variant="outline" size="sm" onClick={onRetry}>
                {retryLabel}
              </Button>
            ) : null}
            {extraAction}
          </div>
        ) : null}
      </AlertDescription>
    </Alert>
  );
}
