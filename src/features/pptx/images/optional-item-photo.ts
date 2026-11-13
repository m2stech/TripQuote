import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import { resolveContainSizing, type BoxInches } from "@/features/pptx/images/resolve-image-sizing";
import { downloadStorageObject } from "@/features/pptx/storage";
import type { ResolvedImage } from "@/features/pptx/types";
import type { UploadedAttachment } from "@/features/quotes/schemas/quote-form.schema";
import type { Database } from "@/lib/supabase/types";

/**
 * Resolve a foto de um item opcional a partir do upload feito no formulário
 * (`item.photo`, bucket `cruise-photos` — reaproveitado, ver
 * `attachment-storage.ts`). Mesmo padrão de `resolveCabinPhoto`: sem busca
 * externa, 100% passthrough form→slide. Sem anexo ou falha de download →
 * placeholder.
 */
export async function resolveOptionalItemPhoto(
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
