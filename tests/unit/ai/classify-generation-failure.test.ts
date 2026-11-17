import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/features/ai/client/openai-client", () => ({
  getOpenAiClient: vi.fn(),
}));

import { getOpenAiClient } from "@/features/ai/client/openai-client";
import {
  classifyGenerationFailure,
  GENERIC_ERROR_MESSAGE,
} from "@/features/ai/orchestration/classify-generation-failure";

function mockAiClassification(output_parsed: unknown) {
  vi.mocked(getOpenAiClient).mockReturnValue({
    responses: { parse: vi.fn().mockResolvedValue({ output_parsed }) },
  } as never);
}

describe("classifyGenerationFailure", () => {
  beforeEach(() => {
    vi.mocked(getOpenAiClient).mockReset();
  });

  it("reconhece cobertura de hotéis incompleta como erro do usuário, sem chamar a IA", async () => {
    const result = await classifyGenerationFailure(
      "A resposta não cobriu todos os hotéis informados no formulário (hotéis não reconhecidos: Hotel X).",
    );

    expect(result.cause).toBe("user_input");
    expect(result.message.toLowerCase()).toContain("hotel");
    expect(getOpenAiClient).not.toHaveBeenCalled();
  });

  it("cita o nome do hotel específico não reconhecido na mensagem ao usuário", async () => {
    const result = await classifyGenerationFailure(
      "A resposta não cobriu todos os hotéis informados no formulário " +
        "(hotéis não reconhecidos: HOTEL Iberostar Waves Bahia All Inclusive).",
    );

    expect(result.cause).toBe("user_input");
    expect(result.message).toContain('"HOTEL Iberostar Waves Bahia All Inclusive"');
    expect(result.message).not.toContain("um ou mais hotéis");
  });

  it("cita todos os nomes quando mais de um hotel não é reconhecido", async () => {
    const result = await classifyGenerationFailure(
      "A resposta não cobriu todos os hotéis informados no formulário " +
        "(hotéis não reconhecidos: Hotel Jardines de Uyuni | Hotel Tayka del Desierto).",
    );

    expect(result.cause).toBe("user_input");
    expect(result.message).toContain('"Hotel Jardines de Uyuni"');
    expect(result.message).toContain('"Hotel Tayka del Desierto"');
  });

  it("cai na mensagem genérica de hotéis quando a mensagem técnica não segue o formato esperado", async () => {
    const result = await classifyGenerationFailure(
      "A resposta não cobriu todos os hotéis informados no formulário (formato inesperado).",
    );

    expect(result.cause).toBe("user_input");
    expect(result.message).toContain("um ou mais hotéis");
  });

  it("reconhece cobertura de roteiro de cruzeiro incompleta como erro do usuário", async () => {
    const result = await classifyGenerationFailure("A resposta não cobriu o roteiro informado no formulário.");

    expect(result.cause).toBe("user_input");
    expect(result.message).toContain("roteiro");
  });

  it("reconhece falha de acesso à imagem de voo como erro do usuário", async () => {
    const result = await classifyGenerationFailure("Não foi possível acessar a imagem de voo enviada.");

    expect(result.cause).toBe("user_input");
    expect(result.message).toContain("imagem de voo");
  });

  it("reconhece resposta fora do schema como erro de sistema", async () => {
    const result = await classifyGenerationFailure(
      "Resposta fora do schema esperado: campo obrigatório ausente",
    );

    expect(result.cause).toBe("system");
  });

  it("usa a IA como fallback para um motivo técnico não reconhecido, sem expor o texto técnico cru", async () => {
    mockAiClassification({
      message: "O serviço de geração encontrou um problema temporário. Tente novamente em instantes.",
      cause: "system",
    });

    const result = await classifyGenerationFailure("ECONNRESET: socket hang up at TLSSocket.onClose");

    expect(getOpenAiClient).toHaveBeenCalledTimes(1);
    expect(result.cause).toBe("system");
    expect(result.message).not.toContain("ECONNRESET");
  });

  it("deixa a IA classificar como erro do usuário quando fizer sentido", async () => {
    mockAiClassification({
      message: "Um dos campos preenchidos no formulário não pôde ser interpretado. Revise e tente de novo.",
      cause: "user_input",
    });

    const result = await classifyGenerationFailure("motivo técnico não mapeado qualquer");

    expect(result.cause).toBe("user_input");
  });

  it("cai na mensagem genérica, sem causa, quando a chamada de classificação por IA falha", async () => {
    vi.mocked(getOpenAiClient).mockImplementation(() => {
      throw new Error("indisponível");
    });

    const result = await classifyGenerationFailure("motivo técnico não mapeado qualquer");

    expect(result).toEqual({ message: GENERIC_ERROR_MESSAGE });
  });

  it("cai na mensagem genérica quando a IA responde algo fora do schema esperado", async () => {
    mockAiClassification({ foo: "bar" });

    const result = await classifyGenerationFailure("motivo técnico não mapeado qualquer");

    expect(result).toEqual({ message: GENERIC_ERROR_MESSAGE });
  });
});
