import "server-only";

import { fetchExternalImage, type FetchedImage } from "@/features/pptx/images/fetch-external-image";

const USER_AGENT = "TripQuoteBot/1.0 (https://tripquote.dev; contato@tripquote.dev)";
const TIMEOUT_MS = 8000;

interface WikipediaSummary {
  originalimage?: { source: string };
  thumbnail?: { source: string };
}

/**
 * Busca uma foto do destino via API REST pública da Wikipedia
 * (`/api/rest_v1/page/summary/{título}`), fonte determinística e estável
 * — ao contrário de depender da IA citar uma URL de imagem via
 * `web_search` (que não verifica se o arquivo de fato existe no momento
 * da resposta; a Responses API não oferece busca de imagem estruturada,
 * só URLs de página). Cobre qualquer destino com artigo na Wikipedia.
 * Nunca lança: sem artigo, sem imagem, ou qualquer falha de rede retornam
 * `null` — quem chama decide o fallback.
 */
export async function fetchWikipediaPhoto(subject: string): Promise<FetchedImage | null> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);

  let summary: WikipediaSummary;
  try {
    const response = await fetch(
      `https://pt.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(subject)}`,
      { headers: { "User-Agent": USER_AGENT }, signal: controller.signal },
    );
    if (!response.ok) return null;
    summary = (await response.json()) as WikipediaSummary;
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }

  const imageUrl = summary.originalimage?.source ?? summary.thumbnail?.source;
  if (!imageUrl) return null;

  return fetchExternalImage(imageUrl);
}
