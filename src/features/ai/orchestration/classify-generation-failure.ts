import "server-only";

import { zodTextFormat } from "openai/helpers/zod";
import { z } from "zod";

import { getOpenAiClient } from "@/features/ai/client/openai-client";
import { HOTEL_COVERAGE_MISMATCH_PREFIX } from "@/features/ai/orchestration/generate-quote-content";
import { quoteErrorCauseSchema, type QuoteErrorCause } from "@/features/quotes/schemas/quote.schema";

/**
 * Mensagem exibida ao usuário quando nem o mapeamento determinístico nem o
 * fallback de IA (ex.: por ela própria ter falhado) conseguem classificar o
 * erro — mesmo texto genérico usado antes desta classificação existir.
 * Sem `errorCause`: a UI não assume nenhuma orientação específica.
 */
export const GENERIC_ERROR_MESSAGE = "Não foi possível gerar o orçamento. Tente novamente.";

export interface ClassifiedFailure {
  /** Mensagem pt-BR pronta para exibição ao usuário — nunca o detalhe técnico. */
  message: string;
  /** Ausente quando a causa não pôde ser determinada (cai no texto genérico). */
  cause?: QuoteErrorCause;
}

interface KnownFailurePattern {
  test: (reason: string) => boolean;
  /** Mensagem fixa, ou derivada do motivo técnico (ex.: para citar nomes extraídos dele). */
  message: string | ((reason: string) => string);
  cause: QuoteErrorCause;
}

/**
 * Extrai os nomes listados por `describeMissingHotels`
 * (`generate-quote-content.ts`) a partir da mensagem técnica completa — ex.:
 * de "... (hotéis não reconhecidos: Hotel A | Hotel B).", devolve
 * `["Hotel A", "Hotel B"]`. Só os nomes do formulário circulam aqui (nunca a
 * resposta da IA nem qualquer outro dado), e nunca saem deste módulo rumo a
 * uma chamada de IA — ficam só na mensagem amigável, determinística, exibida
 * ao usuário.
 */
function extractMissingHotelNames(reason: string): string[] {
  const match = reason.match(/hotéis não reconhecidos: (.+)\)\.$/);
  if (!match) return [];
  return match[1].split(" | ").map((name) => name.trim());
}

function describeMissingHotelsForUser(reason: string): string {
  const names = extractMissingHotelNames(reason);
  const intro =
    names.length === 1
      ? `A IA não conseguiu reconhecer o hotel "${names[0]}"`
      : names.length > 1
        ? `A IA não conseguiu reconhecer os hotéis ${names.map((name) => `"${name}"`).join(", ")}`
        : "A IA não conseguiu reconhecer um ou mais hotéis";

  return (
    `${intro} informado(s) no formulário. Revise o nome na seção "Hotéis" (evite abreviações ou ` +
    "texto extra junto do nome) e tente gerar novamente."
  );
}

/**
 * Padrões reconhecidos a partir das mensagens técnicas lançadas por
 * `generate-quote-content.ts`/`generate-cruise-content.ts` (cobertura de
 * hotéis/portos, schema, recusa do modelo) e pelos módulos de visão
 * (`flight-image-input.ts`/`cruise-itinerary-image-input.ts`). Checados em
 * ordem — o primeiro que casar vence —, então um padrão mais específico deve
 * vir antes de um mais genérico.
 */
const KNOWN_FAILURE_PATTERNS: KnownFailurePattern[] = [
  {
    test: (reason) => reason.startsWith(HOTEL_COVERAGE_MISMATCH_PREFIX),
    message: describeMissingHotelsForUser,
    cause: "user_input",
  },
  {
    test: (reason) => reason.includes("não cobriu o roteiro informado"),
    message:
      "A IA não conseguiu reconhecer o roteiro informado. Revise os portos na seção \"Roteiro\" ou o " +
      "print anexado (se a imagem estiver ilegível, tente enviar uma versão mais nítida) e tente gerar novamente.",
    cause: "user_input",
  },
  {
    test: (reason) => reason.includes("Não foi possível acessar a imagem de voo"),
    message:
      "Não foi possível acessar a imagem de voo enviada. Remova o anexo e envie-o novamente na seção " +
      "\"Voos e serviços\" antes de gerar de novo.",
    cause: "user_input",
  },
  {
    test: (reason) => reason.includes("Não foi possível acessar o print do roteiro"),
    message:
      "Não foi possível acessar o print do roteiro enviado. Remova o anexo e envie-o novamente na seção " +
      "\"Roteiro\" antes de gerar de novo.",
    cause: "user_input",
  },
  {
    test: (reason) => reason.includes("possível recusa"),
    message:
      "A IA recusou gerar o conteúdo para este orçamento. Revise se há dados sensíveis, incomuns ou fora " +
      "do esperado no formulário e tente novamente; se o problema persistir, contate o suporte.",
    cause: "user_input",
  },
  {
    test: (reason) => reason.includes("Resposta fora do schema esperado"),
    message:
      "A IA retornou uma resposta em formato inesperado. Tente gerar novamente; se o problema persistir, " +
      "contate o suporte.",
    cause: "system",
  },
  {
    test: (reason) => reason.includes("Resposta da IA vazia"),
    message:
      "A IA não retornou nenhum conteúdo para este orçamento. Tente gerar novamente; se o problema " +
      "persistir, contate o suporte.",
    cause: "system",
  },
];

function matchKnownFailure(technicalReason: string): ClassifiedFailure | null {
  const pattern = KNOWN_FAILURE_PATTERNS.find(({ test }) => test(technicalReason));
  if (!pattern) return null;

  const message =
    typeof pattern.message === "function" ? pattern.message(technicalReason) : pattern.message;
  return { message, cause: pattern.cause };
}

const classifiedFailureSchema = z.object({
  message: z
    .string()
    .describe(
      "Explicação curta e clara, em português do Brasil, do que deu errado e o que o usuário pode " +
        "fazer a respeito. Nunca inclua termos técnicos, nomes de função, stack trace ou detalhes de " +
        "infraestrutura.",
    ),
  cause: quoteErrorCauseSchema.describe(
    "'user_input' se o usuário pode corrigir algo no formulário (dados incomuns, anexo inválido, etc.) " +
      "e tentar de novo; 'system' se é uma falha de infraestrutura/IA fora do controle dele.",
  ),
});

/**
 * Último recurso para erros técnicos não reconhecidos por
 * `KNOWN_FAILURE_PATTERNS`: pede à IA (modelo leve, sem `web_search`, saída
 * estruturada) uma versão em linguagem de usuário do motivo da falha, mais a
 * classificação da causa. Nunca lança — qualquer falha aqui (timeout, erro de
 * rede) deve apenas resultar em `null`, para o chamador cair no texto
 * genérico em vez de atrasar ou quebrar a tela de erro por causa da própria
 * tradução do erro.
 */
async function classifyWithAi(technicalReason: string): Promise<ClassifiedFailure | null> {
  try {
    const client = getOpenAiClient();
    const response = await client.responses.parse({
      model: "gpt-4.1-mini",
      input: [
        {
          role: "user",
          content: [
            {
              type: "input_text",
              text:
                "Um sistema de geração de orçamentos de viagem por IA falhou com o seguinte erro técnico " +
                "interno (em inglês ou português técnico, nunca mostrado ao usuário final):\n\n" +
                `"${technicalReason}"\n\n` +
                "Reescreva esse motivo em uma mensagem curta e clara para o usuário final (um consultor de " +
                "viagens, não um desenvolvedor), explicando o que aconteceu e o que fazer a seguir, e " +
                "classifique se o usuário pode corrigir algo (dados do formulário, anexo) ou se é uma falha " +
                "do sistema sem ação possível além de tentar novamente.",
            },
          ],
        },
      ],
      text: { format: zodTextFormat(classifiedFailureSchema, "classified_failure") },
    });

    if (!response.output_parsed) return null;

    const validation = classifiedFailureSchema.safeParse(response.output_parsed);
    return validation.success ? validation.data : null;
  } catch {
    return null;
  }
}

/**
 * Traduz o motivo técnico de uma falha de geração (já registrado 1:1 em
 * `generations`/`audit_log`, nunca alterado) para uma mensagem em linguagem
 * de usuário e uma causa classificada, exibidas na tela de detalhe do
 * orçamento. Primeiro tenta o mapeamento determinístico (rápido, sem custo,
 * cobre os erros já conhecidos do sistema); só aciona a IA como fallback para
 * erros não reconhecidos, e cai no texto genérico sem causa se nem isso
 * funcionar.
 */
export async function classifyGenerationFailure(technicalReason: string): Promise<ClassifiedFailure> {
  const knownMatch = matchKnownFailure(technicalReason);
  if (knownMatch) return knownMatch;

  const aiMatch = await classifyWithAi(technicalReason);
  if (aiMatch) return aiMatch;

  return { message: GENERIC_ERROR_MESSAGE };
}
