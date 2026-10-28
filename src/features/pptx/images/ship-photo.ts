import "server-only";

import { findAlternativePhoto } from "@/features/ai/orchestration/find-alternative-photo";
import { fetchGooglePlacesPhoto } from "@/features/pptx/images/google-places-photo";
import { fetchAndSizeImage, sizeImage, type BoxInches } from "@/features/pptx/images/resolve-image-sizing";
import { fetchWikipediaPhoto } from "@/features/pptx/images/wikipedia-photo";
import type { ResolvedImage } from "@/features/pptx/types";
import type { GeneratedPhoto } from "@/features/quotes/schemas/generation-output.schema";

/**
 * Resolve a foto do navio (capa e slide "Conheça o navio"), mesmo padrão em
 * cascata de `resolveDestinationPhoto`: Google Places → Wikipedia → URL
 * citada pela IA (com 1 retry via `findAlternativePhoto`) → placeholder.
 */
export async function resolveShipPhoto(
  shipName: string,
  cruiseLine: string,
  aiPhoto: GeneratedPhoto,
  box: BoxInches,
): Promise<ResolvedImage> {
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
