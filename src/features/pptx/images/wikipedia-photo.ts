import "server-only";

import { fetchExternalImage, type FetchedImage } from "@/features/pptx/images/fetch-external-image";
import { fail, type FetchAttemptResult } from "@/features/pptx/images/photo-diagnostics";

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
 * Nunca lança: sem artigo, sem imagem, ou qualquer falha de rede devolvem
 * `{ ok: false, reason }` — quem chama decide o fallback e pode registrar o
 * motivo para diagnóstico.
 */
export async function fetchWikipediaPhoto(subject: string): Promise<FetchAttemptResult<FetchedImage>> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);

  let summary: WikipediaSummary;
  try {
    const response = await fetch(
      `https://pt.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(subject)}`,
      { headers: { "User-Agent": USER_AGENT }, signal: controller.signal },
    );
    if (!response.ok) return fail(`HTTP ${response.status} ao buscar artigo`);
    summary = (await response.json()) as WikipediaSummary;
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") return fail("timeout ao buscar artigo");
    return fail(error instanceof Error ? error.message : "erro de rede ao buscar artigo");
  } finally {
    clearTimeout(timeout);
  }

  const imageUrl = summary.originalimage?.source ?? summary.thumbnail?.source;
  if (!imageUrl) return fail("artigo sem imagem");

  return fetchExternalImage(imageUrl);
}
