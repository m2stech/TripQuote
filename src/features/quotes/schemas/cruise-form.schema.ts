import { z } from "zod";

import { uploadedAttachmentSchema } from "@/features/quotes/schemas/quote-form.schema";

/**
 * Schemas Zod do formulário de orçamento de Cruzeiro (M11), ao lado do
 * terrestre (`quote-form.schema.ts`). Estrutura própria — portos/cabines em
 * vez de hotéis/voos — unificada com o terrestre só em `quote-form.schema.ts`
 * (`QuoteFormValues` como discriminated union por `productType`). Mensagens
 * de validação em pt-BR.
 */

const requiredText = (message: string) => z.string().trim().min(1, message);

// 01 — Agência e cruzeiro --------------------------------------------------

export const cruiseGeneralDataSchema = z.object({
  agency: requiredText("Informe o nome da agência."),
  consultant: z.string().trim().optional().default(""),
  cruiseLine: requiredText("Informe a companhia marítima."),
  shipName: requiredText("Informe o nome do navio."),
  destination: requiredText("Informe o destino/região do cruzeiro."),
  embarkationPort: requiredText("Informe o porto de embarque."),
  disembarkationPort: z.string().trim().optional().default(""),
  embarkationDate: requiredText("Informe a data de embarque."),
  disembarkationDate: requiredText("Informe a data de desembarque."),
  tripProfile: z.string().trim().optional().default(""),
  occupancy: requiredText("Informe a ocupação considerada."),
  currency: requiredText("Informe a moeda."),
});

export type CruiseGeneralData = z.infer<typeof cruiseGeneralDataSchema>;

// 02 — Capa -----------------------------------------------------------------

export const cruiseCoverSchema = z.object({
  tagline: z.string().trim().optional().default(""),
});

export type CruiseCover = z.infer<typeof cruiseCoverSchema>;

// 03 — Roteiro --------------------------------------------------------------

export const portOperationOptions = [
  "Embarque",
  "Atracado",
  "Ancorado",
  "Navegação",
  "Desembarque",
] as const;

export const cruiseItineraryStopSchema = z.object({
  id: z.string(),
  date: requiredText("Informe a data."),
  portOrDestination: requiredText("Informe o porto ou destino."),
  operation: z.enum(portOperationOptions, { error: "Selecione a operação do dia." }),
  arrival: z.string().trim().optional().default(""),
  departure: z.string().trim().optional().default(""),
});

export type CruiseItineraryStop = z.infer<typeof cruiseItineraryStopSchema>;

/**
 * Tabela digitada e/ou print do roteiro (upload, opcional — a IA extrai via
 * visão, mesmo padrão da imagem de voo no terrestre). Ao menos uma das duas
 * fontes precisa existir — ver `.superRefine` em `cruiseFormSchema`.
 */
export const cruiseItinerarySchema = z.array(cruiseItineraryStopSchema);

// 04 — Navio e experiência a bordo ------------------------------------------

export const cruiseShipSchema = z.object({
  photos: z.array(uploadedAttachmentSchema).max(8, "No máximo 8 fotos do navio."),
  highlights: z.string().trim().optional().default(""),
});

export type CruiseShip = z.infer<typeof cruiseShipSchema>;

// 05 — Cabines e tarifas ------------------------------------------------

export const cabinTypeOptions = ["Garantida (GTY)", "Numerada"] as const;

export const cabinSchema = z.object({
  id: z.string(),
  category: requiredText("Informe a categoria da cabine."),
  type: z.enum(cabinTypeOptions, { error: "Selecione o tipo de cabine." }),
  // Ocupação específica desta cabine, só quando diferente da ocupação geral
  // informada em "01 Agência e cruzeiro".
  occupancy: z.string().trim().optional().default(""),
  price: requiredText("Informe o valor total da cabine."),
  photo: uploadedAttachmentSchema.nullable().default(null),
});

export type Cabin = z.infer<typeof cabinSchema>;

export const cabinsSchema = z.array(cabinSchema).min(1, "Adicione ao menos uma cabine.");

export const portFeesOptions = ["included", "not_included", "not_informed"] as const;

export type PortFeesOption = (typeof portFeesOptions)[number];

export const PORT_FEES_LABELS: Record<PortFeesOption, string> = {
  included: "Incluídas",
  not_included: "Não incluídas",
  not_informed: "Não informar",
};

export const cruiseFareSchema = z
  .object({
    cabins: cabinsSchema,
    portFeesOption: z.enum(portFeesOptions, { error: "Selecione a opção de taxas portuárias e gorjetas." }),
    portFeesValue: z.string().trim().optional().default(""),
    fareRules: z.string().trim().optional().default(""),
  })
  .superRefine((data, ctx) => {
    if (data.portFeesOption === "not_included" && !data.portFeesValue) {
      ctx.addIssue({
        code: "custom",
        path: ["portFeesValue"],
        message: "Informe o valor das taxas portuárias e gorjetas.",
      });
    }
  });

export type CruiseFare = z.infer<typeof cruiseFareSchema>;

// 06 — Forma de pagamento (texto fixo, mesmo padrão do terrestre) -----------

export const cruisePaymentTermsOptions = ["general"] as const;

// 07 — Incluído, não incluído e opcionais ------------------------------------

export const cruiseInclusionsSchema = z.object({
  included: z.array(z.string().trim().min(1)).optional().default([]),
  notIncluded: z.array(z.string().trim().min(1)).optional().default([]),
  optional: z.array(z.string().trim().min(1)).optional().default([]),
  importantInfo: z.string().trim().optional().default(""),
});

export type CruiseInclusions = z.infer<typeof cruiseInclusionsSchema>;

// Formulário completo -------------------------------------------------------

export const cruiseFormSchema = z
  .object({
    productType: z.literal("cruzeiro"),
    general: cruiseGeneralDataSchema,
    cover: cruiseCoverSchema,
    itinerary: cruiseItinerarySchema,
    ship: cruiseShipSchema,
    fare: cruiseFareSchema,
    paymentTerms: z.enum(cruisePaymentTermsOptions).default("general"),
    inclusions: cruiseInclusionsSchema,
    agencyLogo: uploadedAttachmentSchema.nullable().default(null),
    itineraryImage: uploadedAttachmentSchema.nullable().default(null),
  })
  .superRefine((data, ctx) => {
    if (data.itinerary.length === 0 && !data.itineraryImage) {
      ctx.addIssue({
        code: "custom",
        path: ["itinerary"],
        message: "Informe o roteiro (tabela) ou anexe um print do roteiro.",
      });
    }
    if (
      data.general.disembarkationDate &&
      data.general.embarkationDate &&
      data.general.disembarkationDate < data.general.embarkationDate
    ) {
      ctx.addIssue({
        code: "custom",
        path: ["general", "disembarkationDate"],
        message: "A data de desembarque deve ser posterior à data de embarque.",
      });
    }
  });

export type CruiseFormValues = z.infer<typeof cruiseFormSchema>;

/**
 * Formulário em edição (rascunho): mesmo motivo de `quoteDraftSchema` no
 * terrestre — os campos obrigatórios podem estar vazios enquanto o usuário
 * ainda preenche. Validação completa só exigida na seção "09 Gerar".
 */
const cruiseGeneralDataDraftSchema = z.object({
  agency: z.string().trim().optional().default(""),
  consultant: z.string().trim().optional().default(""),
  cruiseLine: z.string().trim().optional().default(""),
  shipName: z.string().trim().optional().default(""),
  destination: z.string().trim().optional().default(""),
  embarkationPort: z.string().trim().optional().default(""),
  disembarkationPort: z.string().trim().optional().default(""),
  embarkationDate: z.string().trim().optional().default(""),
  disembarkationDate: z.string().trim().optional().default(""),
  tripProfile: z.string().trim().optional().default(""),
  occupancy: z.string().trim().optional().default(""),
  currency: z.string().trim().optional().default(""),
});

const cruiseItineraryStopDraftSchema = z.object({
  id: z.string(),
  date: z.string().trim().optional().default(""),
  portOrDestination: z.string().trim().optional().default(""),
  operation: z.enum(portOperationOptions).optional().default(portOperationOptions[0]),
  arrival: z.string().trim().optional().default(""),
  departure: z.string().trim().optional().default(""),
});

const cabinDraftSchema = z.object({
  id: z.string(),
  category: z.string().trim().optional().default(""),
  type: z.enum(cabinTypeOptions).optional().default(cabinTypeOptions[0]),
  occupancy: z.string().trim().optional().default(""),
  price: z.string().trim().optional().default(""),
  photo: uploadedAttachmentSchema.nullable().default(null),
});

const cruiseFareDraftSchema = z.object({
  cabins: z.array(cabinDraftSchema).optional().default([]),
  portFeesOption: z.enum(portFeesOptions).optional().default("not_informed"),
  portFeesValue: z.string().trim().optional().default(""),
  fareRules: z.string().trim().optional().default(""),
});

export const cruiseDraftSchema = z.object({
  productType: z.literal("cruzeiro"),
  general: cruiseGeneralDataDraftSchema.optional(),
  cover: cruiseCoverSchema.optional(),
  itinerary: z.array(cruiseItineraryStopDraftSchema).optional(),
  ship: cruiseShipSchema.optional(),
  fare: cruiseFareDraftSchema.optional(),
  paymentTerms: z.enum(cruisePaymentTermsOptions).optional(),
  inclusions: cruiseInclusionsSchema.optional(),
  agencyLogo: uploadedAttachmentSchema.nullable().optional(),
  itineraryImage: uploadedAttachmentSchema.nullable().optional(),
});

export type CruiseDraftValues = z.infer<typeof cruiseDraftSchema>;

export type CruiseDraftInput = z.input<typeof cruiseDraftSchema>;

export function normalizeCruiseDraft(draft: CruiseDraftValues): CruiseFormValues {
  return {
    productType: "cruzeiro",
    general: { ...cruiseFormDefaultValues.general, ...draft.general },
    cover: { ...cruiseFormDefaultValues.cover, ...draft.cover },
    itinerary: draft.itinerary ?? cruiseFormDefaultValues.itinerary,
    ship: draft.ship ?? cruiseFormDefaultValues.ship,
    fare: {
      ...cruiseFormDefaultValues.fare,
      ...draft.fare,
      cabins: draft.fare?.cabins ?? cruiseFormDefaultValues.fare.cabins,
    },
    paymentTerms: draft.paymentTerms ?? cruiseFormDefaultValues.paymentTerms,
    inclusions: { ...cruiseFormDefaultValues.inclusions, ...draft.inclusions },
    agencyLogo: draft.agencyLogo ?? null,
    itineraryImage: draft.itineraryImage ?? null,
  };
}

export const cruiseFormDefaultValues: CruiseFormValues = {
  productType: "cruzeiro",
  general: {
    agency: "",
    consultant: "",
    cruiseLine: "",
    shipName: "",
    destination: "",
    embarkationPort: "",
    disembarkationPort: "",
    embarkationDate: "",
    disembarkationDate: "",
    tripProfile: "",
    occupancy: "",
    currency: "Real brasileiro (R$)",
  },
  cover: { tagline: "" },
  itinerary: [],
  ship: { photos: [], highlights: "" },
  fare: { cabins: [], portFeesOption: "not_informed", portFeesValue: "", fareRules: "" },
  paymentTerms: "general",
  inclusions: { included: [], notIncluded: [], optional: [], importantInfo: "" },
  agencyLogo: null,
  itineraryImage: null,
};
