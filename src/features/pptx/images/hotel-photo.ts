import "server-only";

import { findAlternativePhoto } from "@/features/ai/orchestration/find-alternative-photo";
import { fetchGooglePlacesPhoto } from "@/features/pptx/images/google-places-photo";
import type { PhotoAttempt } from "@/features/pptx/images/photo-diagnostics";
import { fetchAndSizeImage, sizeImage, type BoxInches } from "@/features/pptx/images/resolve-image-sizing";
import type { ResolvedImage } from "@/features/pptx/types";
import type { GeneratedPhoto } from "@/features/quotes/schemas/generation-output.schema";

export interface ResolveHotelPhotoResult {
  image: ResolvedImage;
  /** Tentativas que falharam, em ordem — vazio quando `image.kind === "image"`. Para diagnóstico via audit_log. */
  attempts: PhotoAttempt[];
}

/**
 * Resolve a foto de um hotel, em ordem de confiabilidade:
 * 1. Google Places API (`fetchGooglePlacesPhoto`) — fonte paga mas
 *    determinística e verificada (busca o estabelecimento real pelo nome e
 *    localização). Requer `GOOGLE_PLACES_API_KEY`; sem ela, pula direto
 *    para o próximo degrau.
 * 2. Fallback: a URL que a IA retornou em `aiOutput.hotels[i].photo` (pode
 *    funcionar, sem custo extra tentar).
 * 3. Último recurso: pedir à IA uma foto alternativa via
 *    `findAlternativePhoto` quando a URL original falha — já valida a URL
 *    sugerida internamente, com seu próprio retry, antes de devolvê-la.
 * 4. Placeholder — desenhado pelo próprio slide como forma nativa (nunca
 *    uma imagem rasterizada substituta).
 *
 * Cada tentativa que falha é acumulada em `attempts` (motivo real: HTTP,
 * timeout, resolução baixa, etc.) — devolvido mesmo quando uma fonte
 * posterior tem sucesso, para que o chamador audite tentativas malsucedidas
 * de fontes "melhores" mesmo com uma foto final válida, e sempre quando o
 * resultado final é placeholder (bug relatado: foto de hotel ausente no
 * .pptx sem nenhum rastro para investigar depois).
 */
export async function resolveHotelPhoto(
  hotelName: string,
  location: string | null,
  aiPhoto: GeneratedPhoto | null,
  box: BoxInches,
): Promise<ResolveHotelPhotoResult> {
  const attempts: PhotoAttempt[] = [];
  const query = location ? `${hotelName}, ${location}` : hotelName;

  const places = await fetchGooglePlacesPhoto(query);
  if (places.ok) {
    const resolved = await sizeImage(places.value, box);
    if (resolved.ok) return { image: resolved.value, attempts };
    attempts.push({ source: "Google Places", reason: resolved.reason });
  } else {
    attempts.push({ source: "Google Places", reason: places.reason });
  }

  if (aiPhoto && aiPhoto.status === "real_photo_found" && aiPhoto.url) {
    const resolved = await fetchAndSizeImage(aiPhoto.url, box);
    if (resolved.ok) return { image: resolved.value, attempts };
    attempts.push({ source: `URL da IA (${aiPhoto.url})`, reason: resolved.reason });

    const alternative = await findAlternativePhoto({ subject: `o hotel ${hotelName}`, failedUrl: aiPhoto.url });
    if (alternative.photo.status === "real_photo_found" && alternative.photo.url) {
      const retryResolved = await fetchAndSizeImage(alternative.photo.url, box);
      if (retryResolved.ok) return { image: retryResolved.value, attempts };
      attempts.push({ source: `URL alternativa da IA (${alternative.photo.url})`, reason: retryResolved.reason });
    } else {
      attempts.push({ source: "Retry da IA", reason: "não encontrou foto alternativa" });
    }
  } else {
    attempts.push({ source: "URL da IA", reason: "aiOutput sem foto confirmada (status !== real_photo_found)" });
  }

  return { image: { kind: "placeholder" }, attempts };
}
