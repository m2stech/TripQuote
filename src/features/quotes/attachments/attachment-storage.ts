import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import { normalizeImage } from "@/lib/utils/image";
import {
  ACCEPTED_IMAGE_MIME_TYPES,
  imageUploadSchema,
  MAX_IMAGE_SIZE_BYTES,
} from "@/lib/validation/image-upload";
import type { Database } from "@/lib/supabase/types";
import type { UploadedAttachment } from "@/features/quotes/schemas/quote-form.schema";

export { ACCEPTED_IMAGE_MIME_TYPES, MAX_IMAGE_SIZE_BYTES };

export type AttachmentKind = Database["public"]["Enums"]["attachment_kind"];

const BUCKET_BY_KIND: Record<"agency_logo" | "flight_image", string> = {
  agency_logo: "agency-logos",
  flight_image: "flight-images",
};

export class AttachmentValidationError extends Error {}

/**
 * Normaliza (Sharp), envia ao Storage e registra em `quote_attachments` um
 * anexo de imagem (logo da agência ou imagem de voo) pertencente a um
 * orçamento já existente (o `quoteId` define o prefixo do path, usado pelas
 * políticas de Storage — ver migration `..._storage_buckets.sql`).
 */
export async function uploadQuoteImageAttachment(
  supabase: SupabaseClient<Database>,
  params: {
    quoteId: string;
    kind: "agency_logo" | "flight_image";
    file: File;
  },
): Promise<UploadedAttachment> {
  const { quoteId, kind, file } = params;

  const validation = imageUploadSchema.safeParse({
    mimeType: file.type,
    sizeBytes: file.size,
  });
  if (!validation.success) {
    throw new AttachmentValidationError(validation.error.issues[0]?.message ?? "Arquivo inválido.");
  }

  const originalBuffer = Buffer.from(await file.arrayBuffer());
  const normalizedBuffer = await normalizeImage(originalBuffer);

  const attachmentId = crypto.randomUUID();
  const storagePath = `${quoteId}/${attachmentId}-${file.name}`;
  const bucket = BUCKET_BY_KIND[kind];

  const { error: uploadError } = await supabase.storage
    .from(bucket)
    .upload(storagePath, normalizedBuffer, { contentType: file.type, upsert: false });
  if (uploadError) {
    throw new Error(`Não foi possível enviar o arquivo: ${uploadError.message}`);
  }

  const { error: insertError } = await supabase.from("quote_attachments").insert({
    id: attachmentId,
    quote_id: quoteId,
    kind,
    storage_path: storagePath,
    file_name: file.name,
    mime_type: file.type,
    size_bytes: normalizedBuffer.byteLength,
  });
  if (insertError) {
    await supabase.storage.from(bucket).remove([storagePath]);
    throw new Error(`Não foi possível registrar o anexo: ${insertError.message}`);
  }

  return {
    fileName: file.name,
    storagePath,
    mimeType: file.type,
    sizeBytes: normalizedBuffer.byteLength,
  };
}

/** Remove um anexo do Storage e do registro em `quote_attachments`. */
export async function removeQuoteImageAttachment(
  supabase: SupabaseClient<Database>,
  params: { kind: "agency_logo" | "flight_image"; storagePath: string },
): Promise<void> {
  const bucket = BUCKET_BY_KIND[params.kind];
  await supabase.storage.from(bucket).remove([params.storagePath]);
  await supabase.from("quote_attachments").delete().eq("storage_path", params.storagePath);
}

/** Gera uma URL assinada (acesso temporário) para preview de um anexo. */
export async function createSignedAttachmentUrl(
  supabase: SupabaseClient<Database>,
  params: { kind: "agency_logo" | "flight_image"; storagePath: string },
  expiresInSeconds = 300,
): Promise<string | null> {
  const bucket = BUCKET_BY_KIND[params.kind];
  const { data, error } = await supabase.storage
    .from(bucket)
    .createSignedUrl(params.storagePath, expiresInSeconds);
  if (error) return null;
  return data.signedUrl;
}
