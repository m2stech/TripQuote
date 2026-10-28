import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import { resolveContainSizing, type BoxInches } from "@/features/pptx/images/resolve-image-sizing";
import { downloadStorageObject } from "@/features/pptx/storage";
import type { ResolvedImage } from "@/features/pptx/types";
import type { UploadedAttachment } from "@/features/quotes/schemas/quote-form.schema";
import type { Database } from "@/lib/supabase/types";

/**
 * Resolve a foto de uma cabine a partir do upload feito no formulário
 * (`cabin.photo`, bucket `cruise-photos`) — mesmo padrão de
 * `resolveAgencyLogo`: baixa o buffer já normalizado pelo Sharp no upload e
 * calcula o sizing para o quadro pedido. Diferente de navio/porto/destino,
 * não há busca externa (Google Places/Wikipedia): não existe fonte pública
 * de fotos de cabine por categoria, só a foto que a própria agência envia.
 * Sem anexo ou em qualquer falha de download → placeholder.
 */
export async function resolveCabinPhoto(
  supabase: SupabaseClient<Database>,
  attachment: UploadedAttachment | null,
  box: BoxInches,
): Promise<ResolvedImage> {
  if (!attachment) return { kind: "placeholder" };

  try {
    const buffer = await downloadStorageObject(supabase, "cruise-photos", attachment.storagePath);
    const sizing = await resolveContainSizing(buffer, box);
    return { kind: "image", data: buffer, sizing };
  } catch {
    return { kind: "placeholder" };
  }
}
