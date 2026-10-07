import "server-only";

import { findAlternativePhoto } from "@/features/ai/orchestration/find-alternative-photo";
import { fetchAndSizeImage, type BoxInches } from "@/features/pptx/images/resolve-image-sizing";
import type { ResolvedImage } from "@/features/pptx/types";
import type { GeneratedPhoto } from "@/features/quotes/schemas/generation-output.schema";

/**
 * Resolve a foto do destino para a capa. Mesma política de
 * `resolveHotelPhoto`: sem foto real confirmada → placeholder direto (capa
 * cai para só o gradiente hero SNOW). Se o fetch da URL original falhar
 * (ex.: URL morta/bloqueada, comum com `web_search`), tenta 1 vez uma foto
 * alternativa via `findAlternativePhoto` antes de desistir.
 */
export async function resolveDestinationPhoto(
  photo: GeneratedPhoto,
  box: BoxInches,
  subject: string,
): Promise<ResolvedImage> {
  if (photo.status !== "real_photo_found" || !photo.url) {
    return { kind: "placeholder" };
  }

  const resolved = await fetchAndSizeImage(photo.url, box);
  if (resolved) return resolved;

  const alternative = await findAlternativePhoto({ subject, failedUrl: photo.url });
  if (alternative.photo.status !== "real_photo_found" || !alternative.photo.url) {
    return { kind: "placeholder" };
  }

  const retryResolved = await fetchAndSizeImage(alternative.photo.url, box);
  return retryResolved ?? { kind: "placeholder" };
}
