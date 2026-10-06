import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";

interface ErrorStateProps {
  title?: string;
  description?: string;
  onRetry?: () => void;
  retryLabel?: string;
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
}: ErrorStateProps) {
  return (
    <Alert variant="destructive" role="alert">
      <AlertTitle>{title}</AlertTitle>
      <AlertDescription>
        <p>{description}</p>
        {onRetry ? (
          <Button type="button" variant="outline" size="sm" onClick={onRetry} className="mt-3">
            {retryLabel}
          </Button>
        ) : null}
      </AlertDescription>
    </Alert>
  );
}
