import "server-only";

import { zodTextFormat } from "openai/helpers/zod";

import { getOpenAiClient } from "@/features/ai/client/openai-client";
import { composeCruisePromptInput } from "@/features/ai/prompt/compose-cruise-prompt";
import { AiGenerationError } from "@/features/ai/orchestration/errors";
import type { CruiseItineraryImagePart } from "@/features/ai/vision/cruise-itinerary-image-input";
import {
  cruiseGenerationOutputSchema,
  type CruiseGenerationOutput,
} from "@/features/quotes/schemas/generation-output.schema";
import type { CruiseFormValues } from "@/features/quotes/schemas/cruise-form.schema";
import type { PromptVersionRecord } from "@/features/prompts/schemas/prompt-version.schema";

const MODEL = "gpt-4.1";

export interface GenerateCruiseContentParams {
  form: CruiseFormValues;
  promptVersion: PromptVersionRecord;
  itineraryImagePart: CruiseItineraryImagePart | null;
}

export interface GenerateCruiseContentResult {
  output: CruiseGenerationOutput;
  model: string;
  promptTokens: number;
  completionTokens: number;
}

/**
 * Valida a cobertura da resposta contra o formulário: o roteiro resultante
 * (`ports`) deve ter ao menos uma entrada quando há portos digitados ou
 * print anexado — mesmo princípio de `hasCompleteHotelCoverage` no
 * terrestre, mas aqui a IA pode legitimamente agrupar escalas repetidas
 * (mesmo porto em dias diferentes) em uma única entrada de `ports`, então a
 * checagem é de presença, não de contagem exata.
 */
function hasMinimalPortCoverage(output: CruiseGenerationOutput, form: CruiseFormValues): boolean {
  const hasItinerarySource = form.itinerary.length > 0 || Boolean(form.itineraryImage);
  if (!hasItinerarySource) return true;
  return output.ports.length > 0;
}

async function callResponsesApi(
  instructions: string,
  itineraryImagePart: CruiseItineraryImagePart | null,
  extraInstruction?: string,
) {
  const client = getOpenAiClient();

  const content: Array<{ type: "input_text"; text: string } | CruiseItineraryImagePart> = [
    { type: "input_text", text: extraInstruction ? `${instructions}\n\n${extraInstruction}` : instructions },
  ];
  if (itineraryImagePart) content.push(itineraryImagePart);

  return client.responses.parse({
    model: MODEL,
    input: [{ role: "user", content }],
    tools: [{ type: "web_search" }],
    text: { format: zodTextFormat(cruiseGenerationOutputSchema, "cruise_generation_output") },
  });
}

/**
 * Orquestra a chamada à Responses API para o produto Cruzeiro — mesmo padrão
 * de `generateQuoteContent` (terrestre): compõe o prompt, chama a OpenAI com
 * `web_search` + saída estruturada, valida em duas camadas e tenta uma
 * segunda vez se a validação falhar.
 */
export async function generateCruiseContent(
  params: GenerateCruiseContentParams,
): Promise<GenerateCruiseContentResult> {
  const { form, promptVersion, itineraryImagePart } = params;
  const { instructions } = composeCruisePromptInput(form, promptVersion.content);

  let lastFailureReason = "Resposta da IA vazia ou não estruturada.";

  for (let attempt = 0; attempt < 2; attempt += 1) {
    const extraInstruction =
      attempt === 0
        ? undefined
        : "A resposta anterior não seguiu o formato ou a cobertura exigidos. Responda novamente, " +
          "no formato estruturado solicitado, garantindo ao menos uma entrada em `ports` quando houver " +
          "roteiro informado (texto e/ou print do roteiro).";

    const response = await callResponsesApi(instructions, itineraryImagePart, extraInstruction);

    if (response.output_parsed === null) {
      lastFailureReason = "O modelo não retornou uma resposta estruturada válida (possível recusa).";
      continue;
    }

    const validation = cruiseGenerationOutputSchema.safeParse(response.output_parsed);
    if (!validation.success) {
      lastFailureReason = `Resposta fora do schema esperado: ${validation.error.issues[0]?.message ?? "erro de validação"}`;
      continue;
    }

    if (!hasMinimalPortCoverage(validation.data, form)) {
      lastFailureReason = "A resposta não cobriu o roteiro informado no formulário.";
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
