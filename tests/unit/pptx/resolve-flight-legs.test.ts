import { describe, expect, it } from "vitest";

import { resolveFlightLegs } from "@/features/pptx/resolve-flight-legs";

describe("resolveFlightLegs", () => {
  it("usa o texto digitado quando presente, ignorando a extração da IA", () => {
    const result = resolveFlightLegs("20JUL - CNF (12:00) / SCL (16:00)", {
      wasImageProvided: true,
      extractedLegs: [{ description: "outro trecho qualquer" }],
      notes: null,
    });
    expect(result).toBe("20JUL - CNF (12:00) / SCL (16:00)");
  });

  it("usa a extração da IA quando o texto digitado está vazio", () => {
    const result = resolveFlightLegs("", {
      wasImageProvided: true,
      extractedLegs: [
        { description: "20JUL - CNF (12:00) / SCL (16:00)" },
        { description: "27JUL - SCL (16:00) / CNF (20:00)" },
      ],
      notes: null,
    });
    expect(result).toBe("20JUL - CNF (12:00) / SCL (16:00)\n27JUL - SCL (16:00) / CNF (20:00)");
  });

  it("retorna string vazia quando não há texto digitado nem extração", () => {
    expect(resolveFlightLegs("", null)).toBe("");
  });

  it("retorna string vazia quando a extração existe mas não encontrou trechos", () => {
    const result = resolveFlightLegs("", {
      wasImageProvided: true,
      extractedLegs: [],
      notes: "Imagem ilegível.",
    });
    expect(result).toBe("");
  });

  it("remove caracteres de controle do texto extraído (ruído de OCR)", () => {
    const result = resolveFlightLegs("", {
      wasImageProvided: true,
      extractedLegs: [{ description: "20JUL - CNF (12:00)\x00 / SCL (16:00)\x07" }],
      notes: null,
    });
    expect(result).toBe("20JUL - CNF (12:00) / SCL (16:00)");
  });

  it("descarta trechos extraídos que ficam vazios após o strip", () => {
    const result = resolveFlightLegs("", {
      wasImageProvided: true,
      extractedLegs: [{ description: "\x00\x01" }, { description: "20JUL - CNF (12:00) / SCL (16:00)" }],
      notes: null,
    });
    expect(result).toBe("20JUL - CNF (12:00) / SCL (16:00)");
  });
});
