import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import { findAlternativePhoto } from "@/features/ai/orchestration/find-alternative-photo";
import { fetchGooglePlacesPhoto } from "@/features/pptx/images/google-places-photo";
import { fetchAndSizeImage, sizeImage, type BoxInches } from "@/features/pptx/images/resolve-image-sizing";
import { fetchWikipediaPhoto } from "@/features/pptx/images/wikipedia-photo";
import { downloadStorageObject } from "@/features/pptx/storage";
import type { ResolvedImage } from "@/features/pptx/types";
import type { GeneratedPhoto } from "@/features/quotes/schemas/generation-output.schema";
import type { UploadedAttachment } from "@/features/quotes/schemas/quote-form.schema";
import type { Database } from "@/lib/supabase/types";

/**
 * Resolve a foto do navio (capa e slide "Conheça o navio"). Navios não são
 * estabelecimentos geolocalizados — companhias/navios recém-lançados (ex.:
 * Corazul/Buenavista, estreando no Brasil) não têm presença indexada ainda
 * em nenhuma fonte automática, e forçar uma busca mais "solta" arrisca
 * trazer um lugar errado (ex.: um shopping ou site de agência de nome
 * parecido) em vez de nenhuma foto. Por isso o upload manual (`manualPhoto`,
 * `ship.photo` no formulário) tem prioridade sobre toda a cascata
 * automática quando presente — o consultor gera primeiro, confere, e sobe a
 * foto manualmente se a busca não encontrar nada ou encontrar algo
 * inadequado. Ordem: upload manual → Google Places → Wikipedia → URL citada
 * pela IA (com 1 retry via `findAlternativePhoto`) → placeholder.
 */
export async function resolveShipPhoto(
  supabase: SupabaseClient<Database>,
  shipName: string,
  cruiseLine: string,
  manualPhoto: UploadedAttachment | null,
  aiPhoto: GeneratedPhoto,
  box: BoxInches,
): Promise<ResolvedImage> {
  if (manualPhoto) {
    try {
      const buffer = await downloadStorageObject(supabase, "cruise-photos", manualPhoto.storagePath);
      const resolved = await sizeImage({ buffer, mimeType: manualPhoto.mimeType }, box);
      if (resolved) return resolved;
    } catch {
      // segue para a cascata automática
    }
  }

  const places = await fetchGooglePlacesPhoto(`navio ${shipName} ${cruiseLine}`);
  if (places) {
    const resolved = await sizeImage(places, box);
    if (resolved) return resolved;
  }

  const wiki = await fetchWikipediaPhoto(shipName);
  if (wiki) {
    const resolved = await sizeImage(wiki, box);
    if (resolved) return resolved;
  }

  if (aiPhoto.status === "real_photo_found" && aiPhoto.url) {
    const resolved = await fetchAndSizeImage(aiPhoto.url, box);
    if (resolved) return resolved;

    const alternative = await findAlternativePhoto({ subject: `navio ${shipName}`, failedUrl: aiPhoto.url });
    if (alternative.photo.status === "real_photo_found" && alternative.photo.url) {
      const retryResolved = await fetchAndSizeImage(alternative.photo.url, box);
      if (retryResolved) return retryResolved;
    }
  }

  return { kind: "placeholder" };
}
