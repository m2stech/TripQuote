import "server-only";

import { findAlternativePhoto } from "@/features/ai/orchestration/find-alternative-photo";
import { fetchGooglePlacesPhoto } from "@/features/pptx/images/google-places-photo";
import { fetchAndSizeImage, sizeImage, type BoxInches } from "@/features/pptx/images/resolve-image-sizing";
import type { ResolvedImage } from "@/features/pptx/types";
import type { GeneratedPhoto } from "@/features/quotes/schemas/generation-output.schema";

/**
 * Resolve a foto de um hotel, em ordem de confiabilidade:
 * 1. Google Places API (`fetchGooglePlacesPhoto`) — fonte paga mas
 *    determinística e verificada (busca o estabelecimento real pelo nome e
 *    localização). Requer `GOOGLE_PLACES_API_KEY`; sem ela, pula direto
 *    para o próximo degrau.
 * 2. Fallback: a URL que a IA retornou em `aiOutput.hotels[i].photo` (pode
 *    funcionar, sem custo extra tentar).
 * 3. Último recurso: pedir à IA uma foto alternativa via
 *    `findAlternativePhoto` (1 retry) quando a URL original falha.
 * 4. Placeholder — desenhado pelo próprio slide como forma nativa (nunca
 *    uma imagem rasterizada substituta).
 */
export async function resolveHotelPhoto(
  hotelName: string,
  location: string | null,
  aiPhoto: GeneratedPhoto | null,
  box: BoxInches,
): Promise<ResolvedImage> {
  const query = location ? `${hotelName}, ${location}` : hotelName;
  const places = await fetchGooglePlacesPhoto(query);
  if (places) {
    const resolved = await sizeImage(places, box);
    if (resolved) return resolved;
  }

  if (aiPhoto && aiPhoto.status === "real_photo_found" && aiPhoto.url) {
    const resolved = await fetchAndSizeImage(aiPhoto.url, box);
    if (resolved) return resolved;

    const alternative = await findAlternativePhoto({ subject: `o hotel ${hotelName}`, failedUrl: aiPhoto.url });
    if (alternative.photo.status === "real_photo_found" && alternative.photo.url) {
      const retryResolved = await fetchAndSizeImage(alternative.photo.url, box);
      if (retryResolved) return retryResolved;
    }
  }

  return { kind: "placeholder" };
}
