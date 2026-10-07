import { describe, expect, it } from "vitest";

import { emu, pt, SLIDE_HEIGHT_IN, SLIDE_WIDTH_IN, SNOW_COLORS } from "@/features/pptx/tokens";

describe("SNOW_COLORS", () => {
  it("usa a paleta real extraída do modelo (Orcamento_modelo.pptx), sem '#'", () => {
    expect(SNOW_COLORS.navy).toBe("091B3A");
    expect(SNOW_COLORS.card).toBe("EEF2F7");
    expect(SNOW_COLORS.hairline).toBe("D5DDE8");
    expect(SNOW_COLORS.hairlineDark).toBe("1E355E");
    expect(SNOW_COLORS.label).toBe("4A6491");
    expect(SNOW_COLORS.body).toBe("2B3648");
    expect(SNOW_COLORS.caption).toBe("5F6B7D");
  });

  it("nenhum valor contém '#'", () => {
    for (const value of Object.values(SNOW_COLORS)) {
      expect(value).not.toContain("#");
    }
  });
});

describe("pt", () => {
  it("converte pontos em polegadas (1pt = 1/72in)", () => {
    expect(pt(72)).toBe(1);
    expect(pt(36)).toBe(0.5);
  });
});

describe("emu", () => {
  it("converte EMU em polegadas (1in = 914400 EMU)", () => {
    expect(emu(914400)).toBe(1);
    expect(emu(457200)).toBe(0.5);
  });
});

describe("dimensões do slide", () => {
  it("bate com 12192000x6858000 EMU (16:9), confirmado no modelo real", () => {
    expect(SLIDE_WIDTH_IN).toBeCloseTo(13.333, 2);
    expect(SLIDE_HEIGHT_IN).toBeCloseTo(7.5, 2);
  });
});
