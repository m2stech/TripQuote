import { createServer } from "node:http";

/**
 * Mock mínimo da Responses API da OpenAI, usado só pelos testes E2E
 * (ver playwright.config.ts / OPENAI_BASE_URL). Substitui a chamada real ao
 * `gpt-4.1` por uma resposta determinística, evitando custo e dependência de
 * rede externa no fluxo "criar → gerar → baixar".
 *
 * Shape exato confirmado lendo o SDK `openai` (node_modules/openai): o
 * parser (`ResponsesParser`) só exige `output[].type === "message"` com
 * `content[].type === "output_text"` e usa `content[].text` (uma STRING
 * JSON) como entrada do `zodTextFormat`. Campos como `model`/`usage` não são
 * validados pelo SDK, mas são lidos direto pelo código de produção
 * (`generate-quote-content.ts`), por isso aparecem aqui.
 *
 * O nome de cada hotel é extraído do próprio prompt enviado pelo app (texto
 * em `input[0].content[].text`) para satisfazer `hasCompleteHotelCoverage`,
 * que exige que a resposta cubra, com os mesmos nomes, todo hotel do
 * formulário.
 */

const PORT = Number(process.env.MOCK_AI_PORT ?? 4010);

function extractHotelNames(promptText: string): string[] {
  // O prompt lista cada hotel como "OPÇÃO N — Nome do hotel" (ver
  // `describeHotels` em features/ai/prompt/compose-prompt.ts).
  const matches = [...promptText.matchAll(/^OPÇÃO \d+ — (.+)$/gm)];
  const names = matches.map((match) => match[1].trim());
  return names.length > 0 ? names : ["Hotel Mock"];
}

function buildGenerationOutput(hotelNames: string[]) {
  return {
    coverTagline: "Uma viagem inesquecível te espera",
    destinationDescription: "Destino mock gerado pelo servidor de testes E2E.",
    destinationAttractions: ["Atração mock 1", "Atração mock 2"],
    destinationPhoto: {
      status: "not_found" as const,
      url: null,
      sourceUrl: null,
      caption: null,
    },
    hotels: hotelNames.map((name) => ({
      name,
      shortDescription: "Hotel mock para testes E2E.",
      location: "Localização mock",
      category: "4 estrelas",
      tripadvisorRating: "4.5",
      photo: {
        status: "not_found" as const,
        url: null,
        sourceUrl: null,
        caption: null,
      },
    })),
    flightImageExtraction: null,
  };
}

const server = createServer((req, res) => {
  if (req.method !== "POST" || !req.url?.endsWith("/responses")) {
    res.writeHead(404, { "Content-Type": "application/json" }).end(JSON.stringify({ error: "not found" }));
    return;
  }

  let body = "";
  req.on("data", (chunk) => (body += chunk));
  req.on("end", () => {
    let hotelNames = ["Hotel Mock"];
    try {
      const parsed = JSON.parse(body);
      const textParts: string[] = (parsed.input ?? []).flatMap(
        (item: { content?: Array<{ type: string; text?: string }> }) =>
          (item.content ?? [])
            .filter((part) => part.type === "input_text" && typeof part.text === "string")
            .map((part) => part.text as string),
      );
      hotelNames = extractHotelNames(textParts.join("\n"));
    } catch {
      // Mantém o fallback de hotelNames se o corpo não puder ser lido.
    }

    const output = buildGenerationOutput(hotelNames);

    const response = {
      id: "resp_mock_e2e",
      object: "response",
      created_at: Math.floor(Date.now() / 1000),
      status: "completed",
      error: null,
      model: "gpt-4.1",
      output: [
        {
          id: "msg_mock_e2e",
          type: "message",
          role: "assistant",
          status: "completed",
          content: [
            {
              type: "output_text",
              text: JSON.stringify(output),
              annotations: [],
            },
          ],
        },
      ],
      usage: {
        input_tokens: 100,
        input_tokens_details: { cached_tokens: 0 },
        output_tokens: 50,
        output_tokens_details: { reasoning_tokens: 0 },
        total_tokens: 150,
      },
    };

    res.writeHead(200, { "Content-Type": "application/json" }).end(JSON.stringify(response));
  });
});

server.listen(PORT, () => {
  console.log(`[mock-ai-server] listening on http://localhost:${PORT}`);
});
