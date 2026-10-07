import { describe, expect, it } from "vitest";

import { parseFlightLeg } from "@/features/pptx/parse-flight-leg";

describe("parseFlightLeg", () => {
  it("parseia o padrão 'DATA - ORIGEM (HORA) / DESTINO (HORA)'", () => {
    const result = parseFlightLeg("20JUL - CNF (12:00) / SCL (16:00)", 0);
    expect(result).not.toBeNull();
    expect(result?.flight).toBe("1");
    expect(result?.origin).toBe("CNF");
    expect(result?.destination).toBe("SCL");
    expect(result?.departure).toContain("20JUL");
    expect(result?.departure).toContain("12:00");
    expect(result?.arrival).toBe("16:00");
  });

  it("retorna null para texto que não casa com o padrão esperado", () => {
    expect(parseFlightLeg("texto livre sem formato nenhum", 0)).toBeNull();
  });

  it("tolera espaços extras", () => {
    const result = parseFlightLeg("  20JUL  -  CNF (12:00)  /  SCL (16:00)  ", 2);
    expect(result).not.toBeNull();
    expect(result?.flight).toBe("3");
  });
});
