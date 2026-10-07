import { describe, expect, it } from "vitest";

import { buildPptxFileName } from "@/features/pptx/filename";

describe("buildPptxFileName", () => {
  it("monta o nome a partir de agência e destino", () => {
    expect(buildPptxFileName("Primus Turismo", "Balneário Camboriú")).toBe(
      "orcamento-Primus-Turismo-Balneario-Camboriu.pptx",
    );
  });

  it("remove acentos e caracteres especiais", () => {
    expect(buildPptxFileName("Ag&ência Éxótica!", "São Paulo / SP")).toBe(
      "orcamento-Ag-encia-Exotica-Sao-Paulo-SP.pptx",
    );
  });

  it("usa fallback 'orcamento' quando o texto fica vazio após slugificar", () => {
    expect(buildPptxFileName("@@@", "###")).toBe("orcamento-orcamento-orcamento.pptx");
  });
});
