import { z } from "zod";

import { normalizeCruiseDraft } from "@/features/quotes/schemas/cruise-form.schema";
import {
  anyGenerationOutputSchema,
  anyQuoteDraftSchema,
  type AnyQuoteDraftValues,
  type AnyQuoteFormValues,
} from "@/features/quotes/schemas/product.schema";
import { migrateLegacyRoomOption, normalizeQuoteDraft } from "@/features/quotes/schemas/quote-form.schema";

/**
 * Schemas Zod do registro de orçamento (metadados + payload do formulário).
 * Representa a entidade persistida (mock até o M5, Supabase a partir dele).
 * O status reflete o ciclo de vida da geração via IA (ver CLAUDE.md).
 */

export const quoteStatusValues = ["draft", "processing", "done", "error"] as const;

export const quoteStatusSchema = z.enum(quoteStatusValues);

export type QuoteStatus = z.infer<typeof quoteStatusSchema>;

export const quoteStatusLabels: Record<QuoteStatus, string> = {
  draft: "Rascunho",
  processing: "Processando",
  done: "Concluído",
  error: "Erro",
};

export const quoteRecordSchema = z.object({
  id: z.string(),
  status: quoteStatusSchema,
  createdAt: z.string(),
  updatedAt: z.string(),
  createdBy: z.string(),
  errorMessage: z.string().optional(),
  form: anyQuoteDraftSchema,
  aiOutput: anyGenerationOutputSchema.nullable().optional(),
  pptxStoragePath: z.string().nullable().optional(),
});

type QuoteRecordParsed = z.infer<typeof quoteRecordSchema>;

function normalizeAnyQuoteDraft(draft: AnyQuoteDraftValues): AnyQuoteFormValues {
  return draft.productType === "cruzeiro" ? normalizeCruiseDraft(draft) : normalizeQuoteDraft(draft);
}

/**
 * Registro de orçamento. `form` é sempre normalizado (por tipo de produto)
 * para sua forma completa, mesmo quando o rascunho no banco está
 * parcialmente preenchido — telas como `toQuoteSummary` podem acessar os
 * campos sem checagem extra.
 */
export type QuoteRecord = Omit<QuoteRecordParsed, "form"> & {
  form: AnyQuoteFormValues;
};

/**
 * Preenche `aiOutput.flightItinerary` como `null` em registros gravados
 * antes da migração de `flightImageExtraction` (M7) para `flightItinerary`
 * (estruturação de voos sempre via IA, não só com imagem) — sem isso, todo
 * orçamento já concluído antes dessa mudança falhava ao ser lido do banco
 * (`invalid_type: expected object, received undefined`). O schema em si
 * mantém o campo obrigatório porque `generationOutputSchema` também é usado
 * para validar a resposta da Responses API (`strict: true` exige todos os
 * campos presentes), então a migração acontece aqui, só na leitura.
 */
function migrateLegacyAiOutput(raw: unknown): unknown {
  if (typeof raw !== "object" || raw === null) return raw;
  const record = raw as Record<string, unknown>;
  const aiOutput = record.aiOutput;
  if (typeof aiOutput !== "object" || aiOutput === null) return raw;

  const aiOutputRecord = aiOutput as Record<string, unknown>;
  if ("flightItinerary" in aiOutputRecord) return raw;

  return {
    ...record,
    aiOutput: { ...aiOutputRecord, flightItinerary: null },
  };
}

/**
 * Migra `hotels[].rooms[]` do formato antigo (1 campo de texto livre "Tipo |
 * Valor") para os campos atuais `roomType`/`price` — ver `migrateLegacyRoomOption`.
 * Só roda na leitura: orçamentos salvos antes dessa mudança têm só `text`.
 */
function migrateLegacyRooms(raw: unknown): unknown {
  if (typeof raw !== "object" || raw === null) return raw;
  const record = raw as Record<string, unknown>;
  const form = record.form;
  if (typeof form !== "object" || form === null) return raw;
  const formRecord = form as Record<string, unknown>;
  if (!Array.isArray(formRecord.hotels)) return raw;

  return {
    ...record,
    form: {
      ...formRecord,
      hotels: formRecord.hotels.map((hotel) => {
        if (typeof hotel !== "object" || hotel === null) return hotel;
        const hotelRecord = hotel as Record<string, unknown>;
        if (!Array.isArray(hotelRecord.rooms)) return hotel;
        return { ...hotelRecord, rooms: hotelRecord.rooms.map(migrateLegacyRoomOption) };
      }),
    },
  };
}

/**
 * Registros gravados antes do M11 não têm `productType` em `form` (coluna
 * nova) — tratá-los como `"terrestre"` antes do parse evita que o
 * discriminated union rejeite todo orçamento já existente no banco.
 */
function withDefaultProductType(raw: unknown): unknown {
  if (typeof raw !== "object" || raw === null) return raw;
  const record = raw as Record<string, unknown>;
  const form = record.form;
  if (typeof form !== "object" || form === null) return raw;
  const formRecord = form as Record<string, unknown>;
  if (typeof formRecord.productType === "string") return raw;

  return { ...record, form: { ...formRecord, productType: "terrestre" } };
}

/** Valida e normaliza um registro bruto (ex.: linha do banco) em `QuoteRecord`. */
export function parseQuoteRecord(raw: unknown): QuoteRecord {
  const withProductType = withDefaultProductType(raw);
  const parsed = quoteRecordSchema.parse(migrateLegacyRooms(migrateLegacyAiOutput(withProductType)));
  return { ...parsed, form: normalizeAnyQuoteDraft(parsed.form) };
}

/**
 * Resumo usado em listagens (evita carregar o formulário completo quando não
 * é necessário). Campos de período (`startDate`/`endDate`) mapeiam, no
 * cruzeiro, para embarque/desembarque.
 */
export interface QuoteSummary {
  id: string;
  status: QuoteStatus;
  productType: AnyQuoteFormValues["productType"];
  agency: string;
  consultant: string;
  destination: string;
  startDate: string;
  endDate: string;
  createdAt: string;
  updatedAt: string;
}

export function toQuoteSummary(record: QuoteRecord): QuoteSummary {
  const { form } = record;
  const isCruise = form.productType === "cruzeiro";

  return {
    id: record.id,
    status: record.status,
    productType: form.productType,
    agency: form.general.agency,
    consultant: form.general.consultant || "—",
    destination: form.general.destination,
    startDate: isCruise ? form.general.embarkationDate : form.general.startDate,
    endDate: isCruise ? form.general.disembarkationDate : form.general.endDate,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
  };
}
