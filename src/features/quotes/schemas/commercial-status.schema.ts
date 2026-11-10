import { z } from "zod";

/**
 * Status comercial do orçamento (M12): desacoplado do status técnico de
 * geração (`QuoteStatus` em `quote.schema.ts`). "Efetivado" exige
 * localizador/referência da venda; "Cancelado" exige justificativa — ver
 * CLAUDE.md > seção comercial e docs/PLAN.md M12.
 */

export const commercialStatusValues = ["pending", "won", "lost"] as const;

export const commercialStatusSchema = z.enum(commercialStatusValues);

export type CommercialStatus = z.infer<typeof commercialStatusSchema>;

export const commercialStatusLabels: Record<CommercialStatus, string> = {
  pending: "Pendente",
  won: "Efetivado",
  lost: "Cancelado",
};

/**
 * Motivos de cancelamento (status "lost"): lista fechada definida pelo
 * negócio, sem opção "Outro" — texto livre não é aceito, ver CLAUDE.md
 * (decisão de 2026-11-10, substitui o Textarea original do M12).
 */
export const cancellationReasonValues = [
  "agency_closed_with_competitor",
  "agency_no_response",
  "client_gave_up",
  "client_closed_with_competitor",
  "client_no_response",
  "price_above_market",
] as const;

export const cancellationReasonSchema = z.enum(cancellationReasonValues);

export type CancellationReason = z.infer<typeof cancellationReasonSchema>;

export const cancellationReasonLabels: Record<CancellationReason, string> = {
  agency_closed_with_competitor: "Agência fechou em outra empresa",
  agency_no_response: "Agência não deu retorno",
  client_gave_up: "Cliente desistiu",
  client_closed_with_competitor: "Cliente fechou em outra empresa",
  client_no_response: "Cliente não deu retorno",
  price_above_market: "Preço acima do mercado",
};

/** Entrada da action que altera o status comercial de um orçamento. */
export const updateCommercialStatusInputSchema = z
  .object({
    status: commercialStatusSchema,
    reference: z.string().trim().optional().default(""),
    reason: z.union([cancellationReasonSchema, z.literal("")]).optional().default(""),
  })
  .superRefine((data, ctx) => {
    if (data.status === "won" && !data.reference) {
      ctx.addIssue({
        code: "custom",
        path: ["reference"],
        message: "Informe o localizador ou referência da venda.",
      });
    }
    if (data.status === "lost" && !data.reason) {
      ctx.addIssue({
        code: "custom",
        path: ["reason"],
        message: "Selecione o motivo do cancelamento.",
      });
    }
  });

export type UpdateCommercialStatusInput = z.infer<typeof updateCommercialStatusInputSchema>;
