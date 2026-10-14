import "server-only";

import { findAlternativePhoto } from "@/features/ai/orchestration/find-alternative-photo";
import { fetchGooglePlacesPhoto } from "@/features/pptx/images/google-places-photo";
import { fetchAndSizeImage, sizeImage, type BoxInches } from "@/features/pptx/images/resolve-image-sizing";
import { fetchWikipediaPhoto } from "@/features/pptx/images/wikipedia-photo";
import type { ResolvedImage } from "@/features/pptx/types";
import type { GeneratedPhoto } from "@/features/quotes/schemas/generation-output.schema";

/**
 * Resolve a foto do destino para a capa, em ordem de confiabilidade:
 * 1. Google Places (`fetchGooglePlacesPhoto`) — fonte paga mas verificada e
 *    em alta resolução; busca o destino como ponto turístico/localidade.
 *    Promovida a primeira fonte (era só usada para hotéis): a Wikipedia
 *    frequentemente retorna a bandeira/brasão do artigo do país/cidade em
 *    baixa resolução em vez de uma foto de paisagem (bug relatado — fotos
 *    "feias" e de baixa qualidade na capa).
 * 2. Wikipedia (`fetchWikipediaPhoto`) — fallback determinístico e
 *    gratuito quando não há `GOOGLE_PLACES_API_KEY` ou a busca não
 *    encontra nada.
 * 3. Fallback: a URL que a IA retornou em `aiOutput.destinationPhoto`
 *    (pode funcionar, sem custo extra tentar).
 * 4. Último recurso: pedir à IA uma foto alternativa via
 *    `findAlternativePhoto` (1 retry) quando a URL original falha.
 * 5. Placeholder — capa cai para só o gradiente hero SNOW.
 *
 * Em todas as etapas, `sizeImage` rejeita (retorna `null`) imagens com
 * resolução baixa demais para `box` — ver `meetsMinimumResolution` em
 * `resolve-image-sizing.ts` — então uma foto pequena nunca é aceita só
 * porque o fetch teve sucesso; o próximo fallback é tentado.
 */
export async function resolveDestinationPhoto(
  destination: string,
  aiPhoto: GeneratedPhoto,
  box: BoxInches,
): Promise<ResolvedImage> {
  // "ponto turístico em X" direciona a busca a um lugar turístico real (ex.:
  // Kinkaku-ji, Eiffel Tower, Parque Unipraias) — a query solta com o nome
  // do destino ("Japão", "Santiago") retorna estabelecimentos genéricos ou
  // irrelevantes (lojas, comércios) na Places API, que é otimizada para
  // negócios/pontos específicos, não regiões geográficas amplas.
  const places = await fetchGooglePlacesPhoto(`ponto turístico em ${destination}`);
  if (places) {
    const resolved = await sizeImage(places, box);
    if (resolved) return resolved;
  }

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
