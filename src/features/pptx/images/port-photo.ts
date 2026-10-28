import "server-only";

import { fetchGooglePlacesPhoto } from "@/features/pptx/images/google-places-photo";
import { fetchAndSizeImage, sizeImage, type BoxInches } from "@/features/pptx/images/resolve-image-sizing";
import { fetchWikipediaPhoto } from "@/features/pptx/images/wikipedia-photo";
import type { ResolvedImage } from "@/features/pptx/types";
import type { GeneratedPhoto } from "@/features/quotes/schemas/generation-output.schema";

/**
 * Resolve a foto de um porto/destino do roteiro (slide "Roteiro dia a
 * dia"), mesmo padrão em cascata de `resolveDestinationPhoto` — sem retry
 * via IA (`findAlternativePhoto`): o roteiro pode ter vários portos, e um
 * placeholder por porto sem foto confirmada é aceitável, diferente da capa.
 */
export async function resolvePortPhoto(
  portName: string,
  aiPhoto: GeneratedPhoto,
  box: BoxInches,
): Promise<ResolvedImage> {
  const places = await fetchGooglePlacesPhoto(`ponto turístico em ${portName}`);
  if (places) {
    const resolved = await sizeImage(places, box);
    if (resolved) return resolved;
  }

  const wiki = await fetchWikipediaPhoto(portName);
  if (wiki) {
    const resolved = await sizeImage(wiki, box);
    if (resolved) return resolved;
  }

  if (aiPhoto.status === "real_photo_found" && aiPhoto.url) {
    const resolved = await fetchAndSizeImage(aiPhoto.url, box);
    if (resolved) return resolved;
  }

  return { kind: "placeholder" };
}
