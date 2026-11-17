import "server-only";

import { zodTextFormat } from "openai/helpers/zod";

import { getOpenAiClient } from "@/features/ai/client/openai-client";
import { composePromptInput } from "@/features/ai/prompt/compose-prompt";
import { AiGenerationError } from "@/features/ai/orchestration/errors";
import type { FlightImagePart } from "@/features/ai/vision/flight-image-input";
import { namesAreEquivalent } from "@/features/pptx/fuzzy-name-match";
import { generationOutputSchema, type GenerationOutput } from "@/features/quotes/schemas/generation-output.schema";
import type { PromptVersionRecord } from "@/features/prompts/schemas/prompt-version.schema";
import type { QuoteFormValues } from "@/features/quotes/schemas/quote-form.schema";

const MODEL = "gpt-4.1";

export interface GenerateQuoteContentParams {
  form: QuoteFormValues;
  promptVersion: PromptVersionRecord;
  flightImagePart: FlightImagePart | null;
}

export interface GenerateQuoteContentResult {
  output: GenerationOutput;
  model: string;
  promptTokens: number;
  completionTokens: number;
}

/**
 * Hotéis do formulário sem correspondência na resposta da IA — vazio quando a
 * cobertura está completa. Comparação de nome tolerante a pequenas
 * divergências de grafia (ver `fuzzy-name-match.ts`) — a IA frequentemente
 * "corrige" nomes próprios digitados pelo usuário (ex.: form tem "Marriot", a
 * IA responde "Marriott"), e uma comparação exata tratava isso como hotel
 * ausente, forçando um retry inútil e, no limite, falhando a geração inteira
 * por 1 caractere de diferença. Não cabe em Zod puro (é uma comparação
 * cruzada entre dois valores), então fica como passo explícito depois do
 * `safeParse`. Mesmo critério de tolerância usado por `matchHotelsByName` no
 * builder PPTX, para que um hotel aceito aqui nunca caia no fallback
 * `ai: null` lá. Também falha (retorna todos os hotéis do form) se a resposta
 * trouxer uma contagem diferente da esperada, mesmo que os nomes batam — ex.:
 * a IA duplicou ou omitiu um hotel.
 */
function findMissingHotels(output: GenerationOutput, form: QuoteFormValues): string[] {
  const missing = form.hotels.filter(
    (hotel) => !output.hotels.some((outputHotel) => namesAreEquivalent(outputHotel.name, hotel.name)),
  );
  if (missing.length > 0) return missing.map((hotel) => hotel.name);
  if (output.hotels.length !== form.hotels.length) return form.hotels.map((hotel) => hotel.name);
  return [];
}

/**
 * Prefixo fixo da mensagem de cobertura incompleta de hotéis — usado tanto
 * aqui quanto em `KNOWN_FAILURE_PATTERNS` (`classify-generation-failure.ts`),
 * que casa por este prefixo e extrai a lista de nomes faltantes (ver
 * `describeMissingHotels`) para montar uma mensagem amigável citando-os,
 * sem nunca repassar o texto técnico nem os nomes a uma IA. Qualquer mudança
 * neste texto ou no formato de `describeMissingHotels` precisa ser replicada
 * lá.
 */
export const HOTEL_COVERAGE_MISMATCH_PREFIX = "A resposta não cobriu todos os hotéis informados no formulário";

/**
 * Descreve os hotéis sem correspondência para diagnóstico e para a mensagem
 * amigável ao usuário (ver `HOTEL_COVERAGE_MISMATCH_PREFIX`) — só chamada
 * quando a cobertura já falhou, nunca no caminho de sucesso.
 */
function describeMissingHotels(missingHotelNames: string[]): string {
  return `hotéis não reconhecidos: ${missingHotelNames.join(" | ")}`;
}

async function callResponsesApi(
  instructions: string,
  flightImagePart: FlightImagePart | null,
  extraInstruction?: string,
) {
  const client = getOpenAiClient();

  const content: Array<{ type: "input_text"; text: string } | FlightImagePart> = [
    { type: "input_text", text: extraInstruction ? `${instructions}\n\n${extraInstruction}` : instructions },
  ];
  if (flightImagePart) content.push(flightImagePart);

  return client.responses.parse({
    model: MODEL,
    input: [{ role: "user", content }],
    tools: [{ type: "web_search" }],
    text: { format: zodTextFormat(generationOutputSchema, "generation_output") },
  });
}

/**
 * Orquestra a chamada à Responses API: compõe o prompt, chama a OpenAI com
 * `web_search` + saída estruturada, valida a resposta em duas camadas
 * (parse automático do SDK + `safeParse` próprio, nunca confiando só no
 * primeiro) e tenta uma única vez mais se a validação falhar.
 */
export async function generateQuoteContent(
  params: GenerateQuoteContentParams,
): Promise<GenerateQuoteContentResult> {
  const { form, promptVersion, flightImagePart } = params;
  const { instructions } = composePromptInput(form, promptVersion.content);

  let lastFailureReason = "Resposta da IA vazia ou não estruturada.";

  for (let attempt = 0; attempt < 2; attempt += 1) {
    const extraInstruction =
      attempt === 0
        ? undefined
        : "A resposta anterior não seguiu o formato ou a cobertura exigidos. Responda novamente, " +
          "no formato estruturado solicitado, garantindo uma entrada em `hotels` para cada hotel " +
          "listado acima, na mesma contagem e com os mesmos nomes.";

    const response = await callResponsesApi(instructions, flightImagePart, extraInstruction);

    if (response.output_parsed === null) {
      lastFailureReason = "O modelo não retornou uma resposta estruturada válida (possível recusa).";
      continue;
    }

    const validation = generationOutputSchema.safeParse(response.output_parsed);
    if (!validation.success) {
      lastFailureReason = `Resposta fora do schema esperado: ${validation.error.issues[0]?.message ?? "erro de validação"}`;
      continue;
    }

    const missingHotelNames = findMissingHotels(validation.data, form);
    if (missingHotelNames.length > 0) {
      lastFailureReason = `${HOTEL_COVERAGE_MISMATCH_PREFIX} (${describeMissingHotels(missingHotelNames)}).`;
      continue;
    }

    return {
      output: validation.data,
      model: response.model,
      promptTokens: response.usage?.input_tokens ?? 0,
      completionTokens: response.usage?.output_tokens ?? 0,
    };
  }

  throw new AiGenerationError(lastFailureReason);
}
