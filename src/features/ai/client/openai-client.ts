import "server-only";

import OpenAI from "openai";

import { getAiEnv } from "@/features/ai/env";

let cachedClient: OpenAI | null = null;

/**
 * Instância única do SDK OpenAI, criada sob demanda. Mantida fora de
 * `generate-quote-content.ts` para que os testes possam mockar só a
 * instanciação do client (`vi.mock("@/features/ai/client/openai-client")`)
 * sem precisar mockar o pacote `openai` inteiro.
 */
export function getOpenAiClient(): OpenAI {
  if (!cachedClient) {
    cachedClient = new OpenAI({ apiKey: getAiEnv().OPENAI_API_KEY });
  }
  return cachedClient;
}
