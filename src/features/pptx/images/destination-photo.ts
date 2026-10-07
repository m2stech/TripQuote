import "server-only";

import { fetchExternalImage } from "@/features/pptx/images/fetch-external-image";
import { resolveContainSizing, type BoxInches } from "@/features/pptx/images/resolve-image-sizing";
import type { ResolvedImage } from "@/features/pptx/types";
import type { GeneratedPhoto } from "@/features/quotes/schemas/generation-output.schema";

/**
 * Resolve a foto do destino para a capa. Mesma política de
 * `resolveHotelPhoto`: sem foto real confirmada ou fetch falho →
 * placeholder, e a capa cai para só o gradiente hero SNOW.
 */
export async function resolveDestinationPhoto(
  photo: GeneratedPhoto,
  box: BoxInches,
): Promise<ResolvedImage> {
  if (photo.status !== "real_photo_found" || !photo.url) {
    return { kind: "placeholder" };
  }

  const fetched = await fetchExternalImage(photo.url);
  if (!fetched) return { kind: "placeholder" };

  try {
    const sizing = await resolveContainSizing(fetched.buffer, box);
    return { kind: "image", data: fetched.buffer, sizing };
  } catch {
    return { kind: "placeholder" };
  }
}
