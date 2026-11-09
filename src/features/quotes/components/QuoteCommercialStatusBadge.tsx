import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  commercialStatusLabels,
  type CommercialStatus,
} from "@/features/quotes/schemas/commercial-status.schema";

const COMMERCIAL_STATUS_CLASS_NAMES: Record<CommercialStatus, string> = {
  pending: "bg-snow-warning-bg text-snow-navy border border-snow-warning-border",
  won: "bg-snow-success-bg text-snow-success-fg",
  lost: "bg-snow-remove-bg text-snow-remove-fg",
};

interface QuoteCommercialStatusBadgeProps {
  status: CommercialStatus;
  className?: string;
}

/**
 * Badge do status comercial (Pendente/Efetivado/Cancelado — M12), desacoplado
 * do status técnico de geração (ver `QuoteStatusBadge`).
 */
export function QuoteCommercialStatusBadge({ status, className }: QuoteCommercialStatusBadgeProps) {
  return (
    <Badge
      variant="outline"
      className={cn("border-0 font-medium", COMMERCIAL_STATUS_CLASS_NAMES[status], className)}
    >
      {commercialStatusLabels[status]}
    </Badge>
  );
}
