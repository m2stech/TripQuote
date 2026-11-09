import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/lib/supabase/types";
import type { UpdateCommercialStatusInput } from "@/features/quotes/schemas/commercial-status.schema";
import type { AnyQuoteDraftValues } from "@/features/quotes/schemas/product.schema";
import {
  parseQuoteRecord,
  toQuoteSummary,
  type QuoteRecord,
} from "@/features/quotes/schemas/quote.schema";
import type {
  GenerationResult,
  QuoteListFilters,
  QuoteListResult,
  QuoteRepository,
} from "@/features/quotes/repository/types";

type QuoteRow = Database["public"]["Tables"]["quotes"]["Row"];

function rowToRecord(row: QuoteRow): QuoteRecord {
  return parseQuoteRecord({
    id: row.id,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    createdBy: row.created_by,
    errorMessage: row.error_message ?? undefined,
    form: row.form,
    aiOutput: row.ai_output ?? null,
    pptxStoragePath: row.pptx_storage_path ?? null,
    commercialStatus: row.commercial_status,
    commercialReference: row.commercial_reference ?? null,
    commercialReason: row.commercial_reason ?? null,
    commercialStatusUpdatedAt: row.commercial_status_updated_at ?? null,
    commercialStatusUpdatedBy: row.commercial_status_updated_by ?? null,
  });
}

/**
 * Projeta o rascunho (terrestre ou cruzeiro) nas colunas desnormalizadas de
 * `quotes` (usadas por filtros/índices da listagem — ver migration init).
 * No cruzeiro, `start_date`/`end_date` mapeiam para embarque/desembarque;
 * `destination` para destino/região do cruzeiro (ver `cruiseGeneralDataSchema`).
 */
function formToColumns(form: AnyQuoteDraftValues | Record<string, never>) {
  const productType = "productType" in form ? form.productType : "terrestre";
  const general = "general" in form ? form.general : undefined;
  const isCruise = productType === "cruzeiro";

  return {
    product_type: productType,
    agency: general?.agency || "",
    consultant: general?.consultant || "",
    destination: general?.destination || "",
    start_date:
      (isCruise
        ? (general as { embarkationDate?: string })?.embarkationDate
        : (general as { startDate?: string })?.startDate) || null,
    end_date:
      (isCruise
        ? (general as { disembarkationDate?: string })?.disembarkationDate
        : (general as { endDate?: string })?.endDate) || null,
    form: form as unknown as Database["public"]["Tables"]["quotes"]["Row"]["form"],
  };
}

/**
 * Implementação de `QuoteRepository` sobre Supabase (M5). Substitui
 * `InMemoryQuoteRepository`, mantendo a mesma interface consumida pelas
 * Server Actions e, indiretamente, pelas telas (ver `features/quotes/actions`).
 * Recebe o client Supabase já autenticado (respeita RLS por `created_by`).
 */
export class SupabaseQuoteRepository implements QuoteRepository {
  constructor(private readonly supabase: SupabaseClient<Database>) {}

  async list(filters: QuoteListFilters = {}): Promise<QuoteListResult> {
    let query = this.supabase
      .from("quotes")
      .select("*", { count: "exact" })
      .order("updated_at", { ascending: false });

    if (filters.createdBy) {
      query = query.eq("created_by", filters.createdBy);
    }
    if (filters.status) {
      query = query.eq("status", filters.status);
    }
    if (filters.commercialStatus) {
      query = query.eq("commercial_status", filters.commercialStatus);
    }
    if (filters.destination) {
      query = query.ilike("destination", `%${filters.destination}%`);
    }
    if (filters.periodStart) {
      query = query.gte("start_date", filters.periodStart);
    }
    if (filters.periodEnd) {
      query = query.lte("end_date", filters.periodEnd);
    }
    if (filters.search) {
      const term = filters.search.replace(/[%,]/g, "");
      query = query.or(
        `agency.ilike.%${term}%,consultant.ilike.%${term}%,destination.ilike.%${term}%`,
      );
    }

    const { data, error, count } = await query;
    if (error) throw new Error(`Não foi possível listar os orçamentos: ${error.message}`);

    const records = (data ?? []).map(rowToRecord);
    const namesByUserId = await this.loadCreatorNames(records.map((record) => record.createdBy));
    return {
      items: records.map((record) => toQuoteSummary(record, namesByUserId.get(record.createdBy))),
      total: count ?? records.length,
    };
  }

  /**
   * Resolve `created_by` (UUID) para o nome exibido na listagem. RLS de
   * `profiles` só permite ler o próprio perfil ou, se admin, qualquer um —
   * suficiente aqui: um consultor só lista os próprios orçamentos (todos com
   * o mesmo `created_by`), e só o admin vê orçamentos de outros usuários.
   */
  private async loadCreatorNames(userIds: string[]): Promise<Map<string, string>> {
    const uniqueIds = Array.from(new Set(userIds));
    if (uniqueIds.length === 0) return new Map();

    const { data, error } = await this.supabase
      .from("profiles")
      .select("id, full_name")
      .in("id", uniqueIds);
    if (error)
      throw new Error(
        `Não foi possível carregar os responsáveis pelos orçamentos: ${error.message}`,
      );

    return new Map(
      (data ?? [])
        .filter((profile): profile is { id: string; full_name: string } =>
          Boolean(profile.full_name),
        )
        .map((profile) => [profile.id, profile.full_name]),
    );
  }

  async getById(id: string): Promise<QuoteRecord | null> {
    const { data, error } = await this.supabase
      .from("quotes")
      .select("*")
      .eq("id", id)
      .maybeSingle();
    if (error) throw new Error(`Não foi possível carregar o orçamento: ${error.message}`);
    return data ? rowToRecord(data) : null;
  }

  async create(form: AnyQuoteDraftValues, createdBy: string): Promise<QuoteRecord> {
    const { data, error } = await this.supabase
      .from("quotes")
      .insert({ ...formToColumns(form), created_by: createdBy, status: "draft" })
      .select("*")
      .single();
    if (error) throw new Error(`Não foi possível criar o orçamento: ${error.message}`);
    return rowToRecord(data);
  }

  async upsertDraft(
    id: string,
    form: AnyQuoteDraftValues,
    createdBy: string,
  ): Promise<QuoteRecord> {
    const { data, error } = await this.supabase
      .from("quotes")
      .upsert(
        { id, ...formToColumns(form), created_by: createdBy, status: "draft" },
        { onConflict: "id", ignoreDuplicates: true },
      )
      .select("*");
    if (error) throw new Error(`Não foi possível salvar o rascunho: ${error.message}`);

    // `ignoreDuplicates: true` faz o Postgres pular a linha em conflito sem
    // retorná-la em `data` — nesse caso (o registro já existe, seja porque
    // outra chamada concorrente criou primeiro, ex.: duplo-mount do Strict
    // Mode, seja porque é uma atualização de um rascunho já salvo),
    // atualizamos o conteúdo de fato.
    if (data && data.length > 0) return rowToRecord(data[0]!);

    return this.update(id, form);
  }

  async ensureDraftExists(id: string, createdBy: string): Promise<QuoteRecord> {
    const { data, error } = await this.supabase
      .from("quotes")
      .upsert(
        {
          id,
          ...formToColumns({} as Record<string, never>),
          created_by: createdBy,
          status: "draft",
        },
        { onConflict: "id", ignoreDuplicates: true },
      )
      .select("*");
    if (error) throw new Error(`Não foi possível salvar o rascunho: ${error.message}`);

    if (data && data.length > 0) return rowToRecord(data[0]!);

    const existing = await this.getById(id);
    if (!existing) throw new Error(`Não foi possível carregar o rascunho ${id}.`);
    return existing;
  }

  async update(id: string, form: AnyQuoteDraftValues): Promise<QuoteRecord> {
    const { data, error } = await this.supabase
      .from("quotes")
      .update(formToColumns(form))
      .eq("id", id)
      .select("*")
      .single();
    if (error) throw new Error(`Não foi possível atualizar o orçamento: ${error.message}`);
    return rowToRecord(data);
  }

  async duplicate(id: string): Promise<QuoteRecord> {
    const existing = await this.getById(id);
    if (!existing) throw new Error(`Orçamento ${id} não encontrado.`);

    const { data, error } = await this.supabase
      .from("quotes")
      .insert({
        ...formToColumns(existing.form),
        created_by: existing.createdBy,
        status: "draft",
      })
      .select("*")
      .single();
    if (error) throw new Error(`Não foi possível duplicar o orçamento: ${error.message}`);

    const duplicated = rowToRecord(data);

    const { data: attachments, error: attachmentsError } = await this.supabase
      .from("quote_attachments")
      .select("*")
      .eq("quote_id", id);
    if (attachmentsError) {
      throw new Error(`Não foi possível duplicar os anexos: ${attachmentsError.message}`);
    }

    const BUCKET_BY_KIND: Record<string, string> = {
      agency_logo: "agency-logos",
      flight_image: "flight-images",
      cruise_itinerary_image: "cruise-photos",
      cruise_photo: "cruise-photos",
    };

    for (const attachment of attachments ?? []) {
      const newStoragePath = attachment.storage_path.replace(id, duplicated.id);
      const bucket = BUCKET_BY_KIND[attachment.kind] ?? "agency-logos";

      const { data: copied, error: copyError } = await this.supabase.storage
        .from(bucket)
        .copy(attachment.storage_path, newStoragePath);
      if (copyError) throw new Error(`Não foi possível copiar o anexo: ${copyError.message}`);
      void copied;

      await this.supabase.from("quote_attachments").insert({
        quote_id: duplicated.id,
        kind: attachment.kind,
        storage_path: newStoragePath,
        file_name: attachment.file_name,
        mime_type: attachment.mime_type,
        size_bytes: attachment.size_bytes,
      });
    }

    return duplicated;
  }

  async remove(id: string): Promise<void> {
    const { error } = await this.supabase.from("quotes").delete().eq("id", id);
    if (error) throw new Error(`Não foi possível excluir o orçamento: ${error.message}`);
  }

  async markProcessing(id: string): Promise<void> {
    const { error } = await this.supabase
      .from("quotes")
      .update({ status: "processing", error_message: null })
      .eq("id", id);
    if (error) throw new Error(`Não foi possível iniciar a geração: ${error.message}`);
  }

  async updateGenerationResult(id: string, result: GenerationResult): Promise<QuoteRecord> {
    const { data, error } = await this.supabase
      .from("quotes")
      .update(
        result.status === "done"
          ? {
              status: "done",
              error_message: null,
              ai_output:
                result.aiOutput as unknown as Database["public"]["Tables"]["quotes"]["Row"]["ai_output"],
            }
          : { status: "error", error_message: result.errorMessage },
      )
      .eq("id", id)
      .select("*")
      .single();
    if (error) throw new Error(`Não foi possível concluir a geração: ${error.message}`);
    return rowToRecord(data);
  }

  async updatePptxStoragePath(id: string, path: string): Promise<QuoteRecord> {
    const { data, error } = await this.supabase
      .from("quotes")
      .update({ pptx_storage_path: path })
      .eq("id", id)
      .select("*")
      .single();
    if (error) throw new Error(`Não foi possível registrar o arquivo gerado: ${error.message}`);
    return rowToRecord(data);
  }

  /**
   * Grava o novo status comercial em `quotes` e insere a linha de auditoria
   * correspondente em `quote_commercial_status_history`. Não há transação
   * real disponível via supabase-js: se o insert do histórico falhar após o
   * update ter sucesso, o status fica correto mas sem o registro de auditoria
   * dessa troca específica — risco aceito (mesmo padrão best-effort usado em
   * `duplicate()`, que copia anexos um a um sem transação).
   */
  async updateCommercialStatus(
    id: string,
    input: UpdateCommercialStatusInput,
    changedBy: string,
  ): Promise<QuoteRecord> {
    const current = await this.getById(id);
    if (!current) throw new Error(`Orçamento ${id} não encontrado.`);

    const now = new Date().toISOString();
    const { data, error } = await this.supabase
      .from("quotes")
      .update({
        commercial_status: input.status,
        commercial_reference: input.status === "won" ? input.reference : null,
        commercial_reason: input.status === "lost" ? input.reason : null,
        commercial_status_updated_at: now,
        commercial_status_updated_by: changedBy,
      })
      .eq("id", id)
      .select("*")
      .single();
    if (error) throw new Error(`Não foi possível atualizar o status comercial: ${error.message}`);

    const { error: historyError } = await this.supabase
      .from("quote_commercial_status_history")
      .insert({
        quote_id: id,
        previous_status: current.commercialStatus,
        new_status: input.status,
        reference: input.status === "won" ? input.reference : null,
        reason: input.status === "lost" ? input.reason : null,
        changed_by: changedBy,
      });
    if (historyError) {
      throw new Error(
        `Não foi possível registrar o histórico do status comercial: ${historyError.message}`,
      );
    }

    return rowToRecord(data);
  }
}
