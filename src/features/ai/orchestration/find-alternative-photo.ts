import "server-only";

import { zodTextFormat } from "openai/helpers/zod";

import { getOpenAiClient } from "@/features/ai/client/openai-client";
import { generatedPhotoSchema, type GeneratedPhoto } from "@/features/quotes/schemas/generation-output.schema";
import { fetchExternalImage } from "@/features/pptx/images/fetch-external-image";

const MODEL = "gpt-4.1";

/**
 * Nº máximo de URLs que a IA pode sugerir nesta busca (chamada original + 1
 * retry) antes de desistir e cair em placeholder. A IA via `web_search`
 * pesquisa texto/páginas, não confirma que a URL citada de fato serve um
 * arquivo de imagem acessível — por isso a URL "alternativa" sugerida falha
 * ao download com frequência semelhante à original (caso relatado: 1ª
 * tentativa no TripAdvisor deu 404, a "alternativa" no Wikimedia Commons
 * também deu 404). 1 retry extra cobre esse padrão sem inflar demais o
 * tempo/custo de geração quando uma foto já não está disponível.
 */
const MAX_ATTEMPTS = 2;

export interface FindAlternativePhotoParams {
  /** Descrição curta do assunto da foto, ex.: "o destino Balneário Camboriú" ou "o hotel Brasil Express". */
  subject: string;
  /** URL que falhou ao ser baixada pelo builder (fetch retornou erro/status não-2xx/content-type não-imagem). */
  failedUrl: string;
}

export interface FindAlternativePhotoResult {
  photo: GeneratedPhoto;
}

const NOT_FOUND_PHOTO: GeneratedPhoto = {
  status: "not_found",
  url: null,
  sourceUrl: null,
  caption: null,
};

function buildInstructions(subject: string, failedUrls: string[]): string {
  const failedList = failedUrls.map((url) => `- ${url}`).join("\n");
  return (
    `Pesquise na web uma foto real e pública para ${subject}, que permita acesso direto (hotlink) ao ` +
    `arquivo de imagem. As URLs abaixo já foram tentadas e não puderam ser acessadas (erro HTTP, timeout ` +
    `ou link inexistente) — não as repita nem sugira variações delas:\n${failedList}\n\n` +
    `Use uma fonte diferente, preferindo o site oficial do destino/hotel ou um portal de turismo oficial. ` +
    `Evite agregadores de reserva (ex.: Booking, Expedia, TripAdvisor), que frequentemente bloqueiam acesso ` +
    `direto à imagem fora do próprio site. Se usar Wikimedia Commons, cite a URL completa e exata do arquivo ` +
    `tal como aparece no resultado da busca (campo "Original file" da página do arquivo) — nunca reconstrua ` +
    `ou adivinhe a URL a partir do nome do arquivo ou do título do artigo, pois isso frequentemente gera uma ` +
    `URL que não existe. Só preencha \`status = "real_photo_found"\` quando tiver encontrado uma URL que ` +
    `veio diretamente de um resultado de busca, nunca uma URL inferida ou construída manualmente; caso ` +
    `contrário, \`status = "not_found"\`. Preencha também \`url\` (URL direta da imagem) e \`sourceUrl\` ` +
    `(página de origem).`
  );
}

async function requestAlternativePhoto(subject: string, failedUrls: string[]): Promise<GeneratedPhoto> {
  const client = getOpenAiClient();
  const response = await client.responses.parse({
    model: MODEL,
    input: [{ role: "user", content: [{ type: "input_text", text: buildInstructions(subject, failedUrls) }] }],
    tools: [{ type: "web_search" }],
    text: { format: zodTextFormat(generatedPhotoSchema, "alternative_photo") },
  });

  if (response.output_parsed === null) return NOT_FOUND_PHOTO;

  const validation = generatedPhotoSchema.safeParse(response.output_parsed);
  if (!validation.success) return NOT_FOUND_PHOTO;

  return validation.data;
}

/**
 * Pesquisa uma foto alternativa quando a URL originalmente retornada pela
 * IA (em `generate-quote-content.ts`) falhou ao ser baixada pelo builder
 * PPTX (ver `features/pptx/images/*-photo.ts`). Verifica a própria URL
 * sugerida antes de devolvê-la (`fetchExternalImage`) e, se também falhar,
 * tenta mais uma vez informando a nova URL morta — até `MAX_ATTEMPTS`
 * chamadas à Responses API no total. Nunca lança: qualquer falha (rede,
 * parse, schema, esgotar as tentativas) devolve `status: "not_found"`, e o
 * builder cai no placeholder normal.
 */
export async function findAlternativePhoto(
  params: FindAlternativePhotoParams,
): Promise<FindAlternativePhotoResult> {
  const failedUrls = [params.failedUrl];

  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt += 1) {
    try {
      const photo = await requestAlternativePhoto(params.subject, failedUrls);
      if (photo.status !== "real_photo_found" || !photo.url) {
        return { photo: NOT_FOUND_PHOTO };
      }

      const fetched = await fetchExternalImage(photo.url);
      if (fetched.ok) {
        return { photo };
      }

      failedUrls.push(photo.url);
    } catch {
      return { photo: NOT_FOUND_PHOTO };
    }
  }

  return { photo: NOT_FOUND_PHOTO };
}
