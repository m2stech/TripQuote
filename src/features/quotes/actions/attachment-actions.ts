"use server";

import { createClient } from "@/lib/supabase/server";
import {
  AttachmentValidationError,
  createSignedAttachmentUrl,
  removeQuoteImageAttachment,
  uploadQuoteImageAttachment,
} from "@/features/quotes/attachments/attachment-storage";
import type { UploadedAttachment } from "@/features/quotes/schemas/quote-form.schema";

export interface UploadAttachmentResult {
  attachment: UploadedAttachment;
  previewUrl: string | null;
}

/**
 * Recebe o arquivo (binário) de um upload da seção 01 (logo da agência) ou
 * 05 (imagem de voo), normaliza com Sharp e grava no Storage + `quote_attachments`.
 * O `quoteId` deve existir (rascunho criado via `ensureDraftQuoteAction`).
 */
export async function uploadQuoteAttachmentAction(
  quoteId: string,
  kind: "agency_logo" | "flight_image",
  formData: FormData,
): Promise<UploadAttachmentResult> {
  const file = formData.get("file");
  if (!(file instanceof File)) {
    throw new Error("Nenhum arquivo enviado.");
  }

  const supabase = await createClient();

  try {
    const attachment = await uploadQuoteImageAttachment(supabase, { quoteId, kind, file });
    const previewUrl = await createSignedAttachmentUrl(supabase, {
      kind,
      storagePath: attachment.storagePath,
    });
    return { attachment, previewUrl };
  } catch (error) {
    if (error instanceof AttachmentValidationError) {
      throw new Error(error.message);
    }
    throw error;
  }
}

export async function removeQuoteAttachmentAction(
  kind: "agency_logo" | "flight_image",
  storagePath: string,
): Promise<void> {
  const supabase = await createClient();
  await removeQuoteImageAttachment(supabase, { kind, storagePath });
}

export async function getAttachmentPreviewUrlAction(
  kind: "agency_logo" | "flight_image",
  storagePath: string,
): Promise<string | null> {
  const supabase = await createClient();
  return createSignedAttachmentUrl(supabase, { kind, storagePath });
}
