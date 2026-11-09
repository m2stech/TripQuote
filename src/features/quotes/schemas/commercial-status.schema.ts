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

/** Entrada da action que altera o status comercial de um orçamento. */
export const updateCommercialStatusInputSchema = z
  .object({
    status: commercialStatusSchema,
    reference: z.string().trim().optional().default(""),
    reason: z.string().trim().optional().default(""),
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
        message: "Informe a justificativa do cancelamento.",
      });
    }
  });

export type UpdateCommercialStatusInput = z.infer<typeof updateCommercialStatusInputSchema>;
