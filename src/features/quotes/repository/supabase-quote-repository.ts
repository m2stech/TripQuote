import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/lib/supabase/types";
import type { QuoteDraftValues } from "@/features/quotes/schemas/quote-form.schema";
import { parseQuoteRecord, toQuoteSummary, type QuoteRecord } from "@/features/quotes/schemas/quote.schema";
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
  });
}

function formToColumns(form: QuoteDraftValues) {
  return {
    agency: form.general?.agency || "",
    consultant: form.general?.consultant || "",
    destination: form.general?.destination || "",
    start_date: form.general?.startDate || null,
    end_date: form.general?.endDate || null,
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

    if (filters.status) {
      query = query.eq("status", filters.status);
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
    return { items: records.map(toQuoteSummary), total: count ?? records.length };
  }

  async getById(id: string): Promise<QuoteRecord | null> {
    const { data, error } = await this.supabase.from("quotes").select("*").eq("id", id).maybeSingle();
    if (error) throw new Error(`Não foi possível carregar o orçamento: ${error.message}`);
    return data ? rowToRecord(data) : null;
  }

  async create(form: QuoteDraftValues, createdBy: string): Promise<QuoteRecord> {
    const { data, error } = await this.supabase
      .from("quotes")
      .insert({ ...formToColumns(form), created_by: createdBy, status: "draft" })
      .select("*")
      .single();
    if (error) throw new Error(`Não foi possível criar o orçamento: ${error.message}`);
    return rowToRecord(data);
  }

  async upsertDraft(id: string, form: QuoteDraftValues, createdBy: string): Promise<QuoteRecord> {
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
        { id, ...formToColumns({}), created_by: createdBy, status: "draft" },
        { onConflict: "id", ignoreDuplicates: true },
      )
      .select("*");
    if (error) throw new Error(`Não foi possível salvar o rascunho: ${error.message}`);

    if (data && data.length > 0) return rowToRecord(data[0]!);

    const existing = await this.getById(id);
    if (!existing) throw new Error(`Não foi possível carregar o rascunho ${id}.`);
    return existing;
  }

  async update(id: string, form: QuoteDraftValues): Promise<QuoteRecord> {
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

    for (const attachment of attachments ?? []) {
      const newStoragePath = attachment.storage_path.replace(id, duplicated.id);
      const bucket = attachment.kind === "flight_image" ? "flight-images" : "agency-logos";

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
              ai_output: result.aiOutput as unknown as Database["public"]["Tables"]["quotes"]["Row"]["ai_output"],
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
}
