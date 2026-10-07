"use server";

import { createClient } from "@/lib/supabase/server";
import { getQuoteRepository } from "@/features/quotes/repository";
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
 * `quoteId` é gerado no client sem bater no banco (ver `QuoteForm`); o upload
 * garante que a linha em `quotes` existe antes de inserir o anexo (FK), mas
 * sem sobrescrever o conteúdo se ela já existir — caso contrário, um upload
 * feito depois de outros campos já salvos apagaria esse conteúdo.
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
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData.user) {
    throw new Error("Sessão expirada. Faça login novamente.");
  }

  const repository = await getQuoteRepository();
  await repository.ensureDraftExists(quoteId, userData.user.id);

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
