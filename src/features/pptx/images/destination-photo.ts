import "server-only";

import { findAlternativePhoto } from "@/features/ai/orchestration/find-alternative-photo";
import { fetchGooglePlacesPhoto } from "@/features/pptx/images/google-places-photo";
import type { PhotoAttempt } from "@/features/pptx/images/photo-diagnostics";
import { fetchAndSizeImage, sizeImage, type BoxInches } from "@/features/pptx/images/resolve-image-sizing";
import { fetchWikipediaPhoto } from "@/features/pptx/images/wikipedia-photo";
import type { ResolvedImage } from "@/features/pptx/types";
import type { GeneratedPhoto } from "@/features/quotes/schemas/generation-output.schema";

export interface ResolveDestinationPhotoResult {
  image: ResolvedImage;
  /** Tentativas que falharam, em ordem — vazio quando `image.kind === "image"`. Para diagnóstico via audit_log. */
  attempts: PhotoAttempt[];
}

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
 *    `findAlternativePhoto` quando a URL original falha — já valida a URL
 *    sugerida internamente, com seu próprio retry, antes de devolvê-la.
 * 5. Placeholder — capa cai para só o gradiente hero SNOW.
 *
 * Em todas as etapas, `sizeImage` rejeita imagens com resolução baixa demais
 * para `box` — ver `meetsMinimumResolution` em `resolve-image-sizing.ts` —
 * então uma foto pequena nunca é aceita só porque o fetch teve sucesso; o
 * próximo fallback é tentado. Cada tentativa que falha é acumulada em
 * `attempts` (motivo real) para diagnóstico, devolvida mesmo quando uma
 * fonte posterior tem sucesso.
 */
export async function resolveDestinationPhoto(
  destination: string,
  aiPhoto: GeneratedPhoto,
  box: BoxInches,
): Promise<ResolveDestinationPhotoResult> {
  const attempts: PhotoAttempt[] = [];

  // "ponto turístico em X" direciona a busca a um lugar turístico real (ex.:
  // Kinkaku-ji, Eiffel Tower, Parque Unipraias) — a query solta com o nome
  // do destino ("Japão", "Santiago") retorna estabelecimentos genéricos ou
  // irrelevantes (lojas, comércios) na Places API, que é otimizada para
  // negócios/pontos específicos, não regiões geográficas amplas.
  const places = await fetchGooglePlacesPhoto(`ponto turístico em ${destination}`);
  if (places.ok) {
    const resolved = await sizeImage(places.value, box);
    if (resolved.ok) return { image: resolved.value, attempts };
    attempts.push({ source: "Google Places", reason: resolved.reason });
  } else {
    attempts.push({ source: "Google Places", reason: places.reason });
  }

  const wiki = await fetchWikipediaPhoto(destination);
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

    const alternative = await findAlternativePhoto({ subject: destination, failedUrl: aiPhoto.url });
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
