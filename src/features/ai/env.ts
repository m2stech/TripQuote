import "server-only";

import { z } from "zod";

/**
 * Validação da variável de ambiente usada pelo cliente OpenAI. Falha cedo e
 * com mensagem clara se `OPENAI_API_KEY` não estiver configurada, em vez de
 * deixar o SDK falhar mais tarde com um erro genérico de autenticação.
 */
const aiEnvSchema = z.object({
  OPENAI_API_KEY: z.string().min(1, "OPENAI_API_KEY não configurada."),
  // Opcional: só usada em testes E2E para apontar o SDK a um servidor mock
  // local em vez da API real da OpenAI. Nunca definida em produção.
  OPENAI_BASE_URL: z.string().url().optional(),
});

export function getAiEnv() {
  return aiEnvSchema.parse({
    OPENAI_API_KEY: process.env.OPENAI_API_KEY,
    OPENAI_BASE_URL: process.env.OPENAI_BASE_URL || undefined,
  });
}
