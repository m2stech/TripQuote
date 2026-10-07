import "server-only";

/**
 * Erro de geração via IA (resposta inválida após o retry, recusa do modelo,
 * etc.). Permite à Server Action diferenciar "erro de geração" (mensagem
 * amigável, grava `status: error`) de erros inesperados de infraestrutura.
 * Nunca inclui o conteúdo do prompt ou a chave da API na mensagem.
 */
export class AiGenerationError extends Error {}
