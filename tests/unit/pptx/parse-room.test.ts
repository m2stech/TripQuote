import { describe, expect, it } from "vitest";

import { parseRoom } from "@/features/pptx/parse-room";

describe("parseRoom", () => {
  it("separa tipo e valor pelo separador '|'", () => {
    const result = parseRoom({ id: "1", text: "Standard | R$ 10.000,00" });
    expect(result.roomType).toBe("Standard");
    expect(result.price).toBe("R$ 10.000,00");
  });

  it("junta partes extras além da segunda no price", () => {
    const result = parseRoom({ id: "1", text: "Duplo | R$ 500,00 | por pessoa" });
    expect(result.roomType).toBe("Duplo");
    expect(result.price).toBe("R$ 500,00 | por pessoa");
  });

  it("sem separador: roomType recebe o texto cru, price vazio", () => {
    const result = parseRoom({ id: "1", text: "Texto livre sem separador" });
    expect(result.roomType).toBe("Texto livre sem separador");
    expect(result.price).toBe("");
  });

  it("sem separador, mas o texto já é um valor monetário: vira price, não roomType", () => {
    const cases = ["R$ 34.814,20", "r$34814,20", "US$ 500", "$ 1.200", "1.325 USD", "500 reais"];
    for (const text of cases) {
      const result = parseRoom({ id: "1", text });
      expect(result.roomType, `roomType for "${text}"`).toBe("");
      expect(result.price, `price for "${text}"`).toBe(text);
    }
  });
});
