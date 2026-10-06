import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { quoteStatusLabels, type QuoteStatus } from "@/features/quotes/schemas/quote.schema";

const STATUS_CLASS_NAMES: Record<QuoteStatus, string> = {
  draft: "bg-snow-secondary-bg text-snow-secondary-fg",
  processing: "bg-snow-warning-bg text-snow-navy border border-snow-warning-border",
  done: "bg-snow-blue text-white",
  error: "bg-snow-remove-bg text-snow-remove-fg",
};

interface QuoteStatusBadgeProps {
  status: QuoteStatus;
  className?: string;
}

/**
 * Badge reutilizável para os 4 estados do ciclo de geração de um orçamento
 * (ver CLAUDE.md > Status da geração): Rascunho, Processando, Concluído, Erro.
 */
export function QuoteStatusBadge({ status, className }: QuoteStatusBadgeProps) {
  return (
    <Badge variant="outline" className={cn("border-0 font-medium", STATUS_CLASS_NAMES[status], className)}>
      {quoteStatusLabels[status]}
    </Badge>
  );
}
