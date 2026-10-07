import "server-only";

export interface FetchedImage {
  buffer: Buffer;
  mimeType: string;
}

export interface FetchExternalImageOptions {
  timeoutMs?: number;
}

const DEFAULT_TIMEOUT_MS = 8000;

/**
 * Busca uma imagem externa (URL retornada pela IA via `web_search`, ou a
 * logo institucional fixa) com timeout e validação de content-type. Nunca
 * lança — qualquer falha (URL malformada, timeout, status não-2xx,
 * content-type que não é imagem) retorna `null`; quem chama decide o
 * fallback (placeholder). Isso é deliberado: os campos de URL da resposta
 * da IA são `z.string()` solto, não `.url()` (ver
 * `generation-output.schema.ts`), então uma URL inválida é um caso
 * esperado, não uma falha de programação.
 */
export async function fetchExternalImage(
  url: string,
  options: FetchExternalImageOptions = {},
): Promise<FetchedImage | null> {
  try {
    new URL(url);
  } catch {
    return null;
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), options.timeoutMs ?? DEFAULT_TIMEOUT_MS);

  try {
    const response = await fetch(url, { signal: controller.signal });
    if (!response.ok) return null;

    const contentType = response.headers.get("content-type") ?? "";
    if (!contentType.startsWith("image/")) return null;

    const buffer = Buffer.from(await response.arrayBuffer());
    return { buffer, mimeType: contentType };
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}
