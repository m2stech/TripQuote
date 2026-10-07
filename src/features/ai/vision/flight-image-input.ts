import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import { createSignedAttachmentUrl } from "@/features/quotes/attachments/attachment-storage";
import type { UploadedAttachment } from "@/features/quotes/schemas/quote-form.schema";
import type { Database } from "@/lib/supabase/types";

export interface FlightImagePart {
  type: "input_image";
  image_url: string;
  detail: "auto";
}

/**
 * Monta a parte multimodal (imagem) do input da Responses API a partir do
 * anexo de voo já armazenado no Storage (upload feito no M5). Reusa
 * `createSignedAttachmentUrl` em vez de baixar o buffer — a Responses API
 * aceita `image_url`, não precisa do binário no M6.
 */
export async function buildFlightImagePart(
  supabase: SupabaseClient<Database>,
  flightImage: UploadedAttachment | null,
): Promise<FlightImagePart | null> {
  if (!flightImage) return null;

  const signedUrl = await createSignedAttachmentUrl(supabase, {
    kind: "flight_image",
    storagePath: flightImage.storagePath,
  });

  if (!signedUrl) {
    throw new Error("Não foi possível acessar a imagem de voo enviada.");
  }

  return { type: "input_image", image_url: signedUrl, detail: "auto" };
}
