import "server-only";

import { findAlternativePhoto } from "@/features/ai/orchestration/find-alternative-photo";
import { fetchAndSizeImage, sizeImage, type BoxInches } from "@/features/pptx/images/resolve-image-sizing";
import { fetchWikipediaPhoto } from "@/features/pptx/images/wikipedia-photo";
import type { ResolvedImage } from "@/features/pptx/types";
import type { GeneratedPhoto } from "@/features/quotes/schemas/generation-output.schema";

/**
 * Resolve a foto do destino para a capa, em ordem de confiabilidade:
 * 1. Wikipedia (`fetchWikipediaPhoto`) — fonte determinística e gratuita,
 *    não depende de o modelo "lembrar" uma URL (a Responses API não
 *    oferece busca de imagem estruturada/verificada; `web_search` só
 *    retorna URLs de página). Cobre a maioria dos destinos turísticos.
 * 2. Fallback: a URL que a IA retornou em `aiOutput.destinationPhoto`
 *    (pode funcionar, sem custo extra tentar).
 * 3. Último recurso: pedir à IA uma foto alternativa via
 *    `findAlternativePhoto` (1 retry) quando a URL original falha.
 * 4. Placeholder — capa cai para só o gradiente hero SNOW.
 */
export async function resolveDestinationPhoto(
  destination: string,
  aiPhoto: GeneratedPhoto,
  box: BoxInches,
): Promise<ResolvedImage> {
  const wiki = await fetchWikipediaPhoto(destination);
  if (wiki) {
    const resolved = await sizeImage(wiki, box);
    if (resolved) return resolved;
  }

  if (aiPhoto.status === "real_photo_found" && aiPhoto.url) {
    const resolved = await fetchAndSizeImage(aiPhoto.url, box);
    if (resolved) return resolved;

    const alternative = await findAlternativePhoto({ subject: destination, failedUrl: aiPhoto.url });
    if (alternative.photo.status === "real_photo_found" && alternative.photo.url) {
      const retryResolved = await fetchAndSizeImage(alternative.photo.url, box);
      if (retryResolved) return retryResolved;
    }
  }

  return { kind: "placeholder" };
}
