import "server-only";

import type { FetchedImage } from "@/features/pptx/images/fetch-external-image";
import { fail, ok, type FetchAttemptResult } from "@/features/pptx/images/photo-diagnostics";

const TIMEOUT_MS = 8000;
/**
 * Pede a maior largura que a Places API (New) aceita (limite documentado:
 * 4800px) — fotos em alta resolução evitam que o slide amplie uma imagem
 * pequena e ela apareça borrada (bug relatado). O custo da chamada não
 * varia com `maxWidthPx`; só o tamanho do arquivo retornado.
 */
const DEFAULT_MAX_WIDTH_PX = 4800;

interface SearchTextResponse {
  places?: Array<{ photos?: Array<{ name: string }> }>;
}

interface PhotoMediaResponse {
  photoUri?: string;
}

/**
 * Busca uma foto real de um hotel via Google Places API (New): fonte paga
 * mas determinística e verificada (ao contrário de depender da IA citar
 * uma URL via `web_search`, que frequentemente aponta para arquivos
 * removidos ou bloqueados por CDNs de reserva/turismo). Requer
 * `GOOGLE_PLACES_API_KEY` configurada — se ausente, ou qualquer falha de
 * rede/HTTP em qualquer uma das duas chamadas (busca + mídia), devolve
 * `{ ok: false, reason }` sem lançar: a feature é opcional/degradável, nunca
 * bloqueia a geração do orçamento. O motivo é usado só para diagnóstico
 * (ver `photo-diagnostics.ts`), nunca para decidir o fluxo.
 */
export async function fetchGooglePlacesPhoto(
  query: string,
  maxWidthPx: number = DEFAULT_MAX_WIDTH_PX,
): Promise<FetchAttemptResult<FetchedImage>> {
  const apiKey = process.env.GOOGLE_PLACES_API_KEY;
  if (!apiKey) return fail("GOOGLE_PLACES_API_KEY não configurada");

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const searchResponse = await fetch("https://places.googleapis.com/v1/places:searchText", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": apiKey,
        "X-Goog-FieldMask": "places.photos",
      },
      body: JSON.stringify({ textQuery: query }),
      signal: controller.signal,
    });
    if (!searchResponse.ok) return fail(`HTTP ${searchResponse.status} na busca de lugar`);

    const searchData = (await searchResponse.json()) as SearchTextResponse;
    const photoName = searchData.places?.[0]?.photos?.[0]?.name;
    if (!photoName) return fail("nenhum lugar/foto encontrado para a busca");

    const mediaResponse = await fetch(
      `https://places.googleapis.com/v1/${photoName}/media?maxWidthPx=${maxWidthPx}&key=${apiKey}&skipHttpRedirect=true`,
      { signal: controller.signal },
    );
    if (!mediaResponse.ok) return fail(`HTTP ${mediaResponse.status} ao resolver mídia da foto`);

    const mediaData = (await mediaResponse.json()) as PhotoMediaResponse;
    if (!mediaData.photoUri) return fail("resposta de mídia sem photoUri");

    const imageResponse = await fetch(mediaData.photoUri, { signal: controller.signal });
    if (!imageResponse.ok) return fail(`HTTP ${imageResponse.status} ao baixar a imagem`);

    const contentType = imageResponse.headers.get("content-type") ?? "";
    if (!contentType.startsWith("image/")) {
      return fail(`content-type não é imagem (${contentType || "ausente"})`);
    }

    const buffer = Buffer.from(await imageResponse.arrayBuffer());
    return ok({ buffer, mimeType: contentType });
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") return fail("timeout");
    return fail(error instanceof Error ? error.message : "erro de rede desconhecido");
  } finally {
    clearTimeout(timeout);
  }
}
