import "server-only";

import { zodTextFormat } from "openai/helpers/zod";

import { getOpenAiClient } from "@/features/ai/client/openai-client";
import { generatedPhotoSchema, type GeneratedPhoto } from "@/features/quotes/schemas/generation-output.schema";

const MODEL = "gpt-4.1";

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

/**
 * Pesquisa uma foto alternativa quando a URL originalmente retornada pela
 * IA (em `generate-quote-content.ts`) falhou ao ser baixada pelo builder
 * PPTX (ver `features/pptx/images/*-photo.ts`). É uma segunda chamada à
 * Responses API, independente da geração completa do orçamento — nunca
 * lança: qualquer falha (rede, parse, schema) aqui apenas devolve
 * `status: "not_found"`, e o builder cai no placeholder normal. Não faz
 * retry adicional (já é, em si, o retry de uma falha anterior).
 */
export async function findAlternativePhoto(
  params: FindAlternativePhotoParams,
): Promise<FindAlternativePhotoResult> {
  try {
    const client = getOpenAiClient();
    const instructions =
      `Pesquise na web uma foto real e pública para ${params.subject}, que permita acesso direto ` +
      `(hotlink) ao arquivo de imagem. A URL ${params.failedUrl} não pôde ser acessada — não a repita; ` +
      `use uma fonte diferente, preferindo Wikimedia Commons, o site oficial do destino/hotel, ou um ` +
      `portal de turismo oficial. Evite agregadores de reserva (ex.: Booking, Expedia, TripAdvisor), ` +
      `que frequentemente bloqueiam acesso direto à imagem fora do próprio site. Preencha ` +
      `\`status = "real_photo_found"\`, \`url\` (URL direta da imagem) e \`sourceUrl\` (página de ` +
      `origem) se encontrar; caso contrário, \`status = "not_found"\`.`;

    const response = await client.responses.parse({
      model: MODEL,
      input: [{ role: "user", content: [{ type: "input_text", text: instructions }] }],
      tools: [{ type: "web_search" }],
      text: { format: zodTextFormat(generatedPhotoSchema, "alternative_photo") },
    });

    if (response.output_parsed === null) {
      return { photo: NOT_FOUND_PHOTO };
    }

    const validation = generatedPhotoSchema.safeParse(response.output_parsed);
    if (!validation.success) {
      return { photo: NOT_FOUND_PHOTO };
    }

    return { photo: validation.data };
  } catch {
    return { photo: NOT_FOUND_PHOTO };
  }
}
