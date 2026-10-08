import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import { normalizeImage } from "@/lib/utils/image";
import { imageUploadSchema } from "@/lib/validation/image-upload";
import type { Database } from "@/lib/supabase/types";

const BUCKET = "branding-assets";

export class BrandingLogoValidationError extends Error {}

/**
 * Normaliza (Sharp) e envia a logo institucional ao bucket `branding-assets`,
 * substituindo o arquivo anterior (path fixo — sempre um único arquivo ativo,
 * mesma ideia da linha singleton de `branding_settings`).
 */
export async function uploadInstitutionalLogo(
  supabase: SupabaseClient<Database>,
  file: File,
): Promise<string> {
  const validation = imageUploadSchema.safeParse({ mimeType: file.type, sizeBytes: file.size });
  if (!validation.success) {
    throw new BrandingLogoValidationError(validation.error.issues[0]?.message ?? "Arquivo inválido.");
  }

  const originalBuffer = Buffer.from(await file.arrayBuffer());
  const normalizedBuffer = await normalizeImage(originalBuffer);
  const storagePath = `institutional-logo`;

  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(storagePath, normalizedBuffer, { contentType: file.type, upsert: true });
  if (error) {
    throw new Error(`Não foi possível enviar a logo: ${error.message}`);
  }

  return storagePath;
}

/** Gera uma URL assinada (acesso temporário) para preview/uso da logo institucional. */
export async function createSignedInstitutionalLogoUrl(
  supabase: SupabaseClient<Database>,
  storagePath: string,
  expiresInSeconds = 300,
): Promise<string | null> {
  const { data, error } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(storagePath, expiresInSeconds);
  if (error) return null;
  return data.signedUrl;
}

/** Baixa o binário da logo institucional diretamente do Storage (uso no builder PPTX). */
export async function downloadInstitutionalLogo(
  supabase: SupabaseClient<Database>,
  storagePath: string,
): Promise<Buffer | null> {
  const { data, error } = await supabase.storage.from(BUCKET).download(storagePath);
  if (error || !data) return null;
  return Buffer.from(await data.arrayBuffer());
}
