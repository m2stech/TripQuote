import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import { resolveContainSizing, type BoxInches } from "@/features/pptx/images/resolve-image-sizing";
import { downloadStorageObject } from "@/features/pptx/storage";
import type { ResolvedImage } from "@/features/pptx/types";
import type { UploadedAttachment } from "@/features/quotes/schemas/quote-form.schema";
import type { Database } from "@/lib/supabase/types";

/**
 * Baixa o buffer bruto da logo da agência do Storage, sem calcular sizing —
 * usado tanto por `resolveAgencyLogo` (abaixo) quanto por quem precisa do
 * buffer para outro fim (ex.: `extractThemeFromLogo`), evitando baixar o
 * mesmo arquivo duas vezes. `null` sem anexo ou em qualquer falha de
 * download — nunca lança.
 */
export async function downloadAgencyLogoBuffer(
  supabase: SupabaseClient<Database>,
  attachment: UploadedAttachment | null,
): Promise<Buffer | null> {
  if (!attachment) return null;
  try {
    return await downloadStorageObject(supabase, "agency-logos", attachment.storagePath);
  } catch {
    return null;
  }
}

/**
 * Resolve a logo da agência a partir do Storage (upload já feito no M5,
 * buffer já normalizado pelo Sharp naquele momento — aqui só calculamos o
 * sizing para o quadro pedido, sem normalizar de novo). Sem anexo →
 * placeholder (slide renderiza sem logo, nunca quebra a geração).
 */
export async function resolveAgencyLogo(
  supabase: SupabaseClient<Database>,
  attachment: UploadedAttachment | null,
  box: BoxInches,
): Promise<ResolvedImage> {
  const buffer = await downloadAgencyLogoBuffer(supabase, attachment);
  if (!buffer) return { kind: "placeholder" };

  try {
    const sizing = await resolveContainSizing(buffer, box);
    return { kind: "image", data: buffer, sizing };
  } catch {
    return { kind: "placeholder" };
  }
}
