import "server-only";

import { fetchExternalImage } from "@/features/pptx/images/fetch-external-image";
import { resolveContainSizing, type BoxInches } from "@/features/pptx/images/resolve-image-sizing";
import type { ResolvedImage } from "@/features/pptx/types";
import type { GeneratedPhoto } from "@/features/quotes/schemas/generation-output.schema";

/**
 * Resolve a foto de um hotel a partir do que a IA retornou. Só tenta o
 * fetch quando `status === "real_photo_found"` e há `url`; qualquer outro
 * caso (sem dados, "illustration_required", "not_found", ou o fetch
 * falhando) cai em placeholder — desenhado pelo próprio slide como forma
 * nativa (nunca uma imagem rasterizada substituta).
 */
export async function resolveHotelPhoto(
  photo: GeneratedPhoto | null,
  box: BoxInches,
): Promise<ResolvedImage> {
  if (!photo || photo.status !== "real_photo_found" || !photo.url) {
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
