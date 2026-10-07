import "server-only";

import type { FetchedImage } from "@/features/pptx/images/fetch-external-image";

const TIMEOUT_MS = 8000;
const DEFAULT_MAX_WIDTH_PX = 1600;

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
 * rede/HTTP em qualquer uma das duas chamadas (busca + mídia), retorna
 * `null` sem lançar: a feature é opcional/degradável, nunca bloqueia a
 * geração do orçamento.
 */
export async function fetchGooglePlacesPhoto(
  query: string,
  maxWidthPx: number = DEFAULT_MAX_WIDTH_PX,
): Promise<FetchedImage | null> {
  const apiKey = process.env.GOOGLE_PLACES_API_KEY;
  if (!apiKey) return null;

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
    if (!searchResponse.ok) return null;

    const searchData = (await searchResponse.json()) as SearchTextResponse;
    const photoName = searchData.places?.[0]?.photos?.[0]?.name;
    if (!photoName) return null;

    const mediaResponse = await fetch(
      `https://places.googleapis.com/v1/${photoName}/media?maxWidthPx=${maxWidthPx}&key=${apiKey}&skipHttpRedirect=true`,
      { signal: controller.signal },
    );
    if (!mediaResponse.ok) return null;

    const mediaData = (await mediaResponse.json()) as PhotoMediaResponse;
    if (!mediaData.photoUri) return null;

    const imageResponse = await fetch(mediaData.photoUri, { signal: controller.signal });
    if (!imageResponse.ok) return null;

    const contentType = imageResponse.headers.get("content-type") ?? "";
    if (!contentType.startsWith("image/")) return null;

    const buffer = Buffer.from(await imageResponse.arrayBuffer());
    return { buffer, mimeType: contentType };
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}
