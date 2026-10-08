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
    const env = getAiEnv();
    cachedClient = new OpenAI({ apiKey: env.OPENAI_API_KEY, baseURL: env.OPENAI_BASE_URL });
  }
  return cachedClient;
}
