import { describe, expect, it } from "vitest";

import { pt, SNOW_COLORS } from "@/features/pptx/tokens";

describe("SNOW_COLORS", () => {
  it("usa os valores hex exatos do CLAUDE.md, sem '#'", () => {
    expect(SNOW_COLORS.navy).toBe("122B45");
    expect(SNOW_COLORS.blue).toBe("008FBD");
    expect(SNOW_COLORS.orange).toBe("F26522");
    expect(SNOW_COLORS.bg).toBe("F3F7FA");
    expect(SNOW_COLORS.line).toBe("D9E4EB");
    expect(SNOW_COLORS.muted).toBe("5C7180");
    expect(SNOW_COLORS.heroStart).toBe("102B43");
    expect(SNOW_COLORS.heroEnd).toBe("175171");
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
    expect(pt(150)).toBeCloseTo(2.0833, 4);
  });
});
