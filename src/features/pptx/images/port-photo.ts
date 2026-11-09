import "server-only";

import { fetchGooglePlacesPhoto } from "@/features/pptx/images/google-places-photo";
import type { PhotoAttempt } from "@/features/pptx/images/photo-diagnostics";
import { fetchAndSizeImage, sizeImage, type BoxInches } from "@/features/pptx/images/resolve-image-sizing";
import { fetchWikipediaPhoto } from "@/features/pptx/images/wikipedia-photo";
import type { ResolvedImage } from "@/features/pptx/types";
import type { GeneratedPhoto } from "@/features/quotes/schemas/generation-output.schema";

export interface ResolvePortPhotoResult {
  image: ResolvedImage;
  /** Tentativas que falharam, em ordem — vazio quando `image.kind === "image"`. Para diagnóstico via audit_log. */
  attempts: PhotoAttempt[];
}

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
): Promise<ResolvePortPhotoResult> {
  const attempts: PhotoAttempt[] = [];

  const places = await fetchGooglePlacesPhoto(`ponto turístico em ${portName}`);
  if (places.ok) {
    const resolved = await sizeImage(places.value, box);
    if (resolved.ok) return { image: resolved.value, attempts };
    attempts.push({ source: "Google Places", reason: resolved.reason });
  } else {
    attempts.push({ source: "Google Places", reason: places.reason });
  }

  const wiki = await fetchWikipediaPhoto(portName);
  if (wiki.ok) {
    const resolved = await sizeImage(wiki.value, box);
    if (resolved.ok) return { image: resolved.value, attempts };
    attempts.push({ source: "Wikipedia", reason: resolved.reason });
  } else {
    attempts.push({ source: "Wikipedia", reason: wiki.reason });
  }

  if (aiPhoto.status === "real_photo_found" && aiPhoto.url) {
    const resolved = await fetchAndSizeImage(aiPhoto.url, box);
    if (resolved.ok) return { image: resolved.value, attempts };
    attempts.push({ source: `URL da IA (${aiPhoto.url})`, reason: resolved.reason });
  } else {
    attempts.push({ source: "URL da IA", reason: "aiOutput sem foto confirmada (status !== real_photo_found)" });
  }

  return { image: { kind: "placeholder" }, attempts };
}
