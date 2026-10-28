import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import { createSignedAttachmentUrl } from "@/features/quotes/attachments/attachment-storage";
import type { UploadedAttachment } from "@/features/quotes/schemas/quote-form.schema";
import type { Database } from "@/lib/supabase/types";

export interface CruiseItineraryImagePart {
  type: "input_image";
  image_url: string;
  detail: "auto";
}

/**
 * Monta a parte multimodal (imagem) do input da Responses API a partir do
 * print do roteiro de cruzeiro anexado (upload no formulário, M11). Mesmo
 * padrão de `buildFlightImagePart`: usa a URL assinada, não o binário.
 */
export async function buildCruiseItineraryImagePart(
  supabase: SupabaseClient<Database>,
  itineraryImage: UploadedAttachment | null,
): Promise<CruiseItineraryImagePart | null> {
  if (!itineraryImage) return null;

  const signedUrl = await createSignedAttachmentUrl(supabase, {
    kind: "cruise_itinerary_image",
    storagePath: itineraryImage.storagePath,
  });

  if (!signedUrl) {
    throw new Error("Não foi possível acessar o print do roteiro enviado.");
  }

  return { type: "input_image", image_url: signedUrl, detail: "auto" };
}
