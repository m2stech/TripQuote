import { describe, expect, it } from "vitest";

import { contrastRatio, meetsAccessibleContrast, relativeLuminance } from "@/features/pptx/theme/contrast";

describe("relativeLuminance", () => {
  it("branco tem luminosidade 1, preto tem luminosidade 0", () => {
    expect(relativeLuminance("FFFFFF")).toBeCloseTo(1, 5);
    expect(relativeLuminance("000000")).toBeCloseTo(0, 5);
  });
});

describe("contrastRatio", () => {
  it("preto sobre branco tem contraste máximo (21:1)", () => {
    expect(contrastRatio("000000", "FFFFFF")).toBeCloseTo(21, 0);
  });

  it("uma cor contra ela mesma tem contraste 1:1", () => {
    expect(contrastRatio("D4AC34", "D4AC34")).toBeCloseTo(1, 2);
  });

  it("é simétrico (ordem dos argumentos não importa)", () => {
    expect(contrastRatio("D4AC34", "FFFFFF")).toBeCloseTo(contrastRatio("FFFFFF", "D4AC34"), 5);
  });
});

describe("meetsAccessibleContrast", () => {
  it("dourado claro (ex.: logo GW) não atinge contraste AA contra branco", () => {
    // Caso real reportado: texto branco sobre dourado ficava ilegível.
    expect(meetsAccessibleContrast("D4AC34", "FFFFFF")).toBe(false);
  });

  it("dourado claro atinge contraste AA contra preto", () => {
    expect(meetsAccessibleContrast("D4AC34", "000000")).toBe(true);
  });

  it("navy escuro atinge contraste AA contra branco", () => {
    expect(meetsAccessibleContrast("091B3A", "FFFFFF")).toBe(true);
  });
});
