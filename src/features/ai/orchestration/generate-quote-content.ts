import "server-only";

import { zodTextFormat } from "openai/helpers/zod";

import { getOpenAiClient } from "@/features/ai/client/openai-client";
import { composePromptInput } from "@/features/ai/prompt/compose-prompt";
import { AiGenerationError } from "@/features/ai/orchestration/errors";
import type { FlightImagePart } from "@/features/ai/vision/flight-image-input";
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
 * Valida a cobertura da resposta contra o formulário: todo hotel do form
 * deve aparecer na resposta, na mesma contagem. Não cabe em Zod puro (é uma
 * comparação cruzada entre dois valores), então fica como passo explícito
 * depois do `safeParse`.
 */
function hasCompleteHotelCoverage(output: GenerationOutput, form: QuoteFormValues): boolean {
  if (output.hotels.length !== form.hotels.length) return false;
  const outputNames = new Set(output.hotels.map((hotel) => hotel.name));
  return form.hotels.every((hotel) => outputNames.has(hotel.name));
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

    if (!hasCompleteHotelCoverage(validation.data, form)) {
      lastFailureReason = "A resposta não cobriu todos os hotéis informados no formulário.";
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
