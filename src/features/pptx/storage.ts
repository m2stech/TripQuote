import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/lib/supabase/types";

/**
 * Baixa o buffer de um objeto do Storage. Genérico por bucket — usado para
 * ler a logo da agência (`agency-logos`, upload já feito no M5). Não existe
 * função equivalente hoje: `createSignedAttachmentUrl`
 * (`attachment-storage.ts`) retorna uma URL, não um buffer.
 */
export async function downloadStorageObject(
  supabase: SupabaseClient<Database>,
  bucket: string,
  path: string,
): Promise<Buffer> {
  const { data, error } = await supabase.storage.from(bucket).download(path);
  if (error || !data) {
    throw new Error(`Não foi possível baixar o arquivo: ${error?.message ?? "desconhecido"}`);
  }
  return Buffer.from(await data.arrayBuffer());
}

/**
 * Salva o .pptx gerado no Storage, sempre no mesmo path por orçamento
 * (`{quote_id}/orcamento.pptx`) — regeneração sobrescreve via `upsert`,
 * sem manter histórico de versões antigas (consistente com `ai_output`,
 * que também não guarda histórico entre regenerações).
 */
export async function uploadGeneratedPptx(
  supabase: SupabaseClient<Database>,
  quoteId: string,
  buffer: Buffer,
): Promise<string> {
  const storagePath = `${quoteId}/orcamento.pptx`;
  const { error } = await supabase.storage.from("generated-pptx").upload(storagePath, buffer, {
    contentType: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    upsert: true,
  });
  if (error) {
    throw new Error(`Não foi possível salvar o arquivo gerado: ${error.message}`);
  }
  return storagePath;
}
