import { describe, expect, it } from "vitest";

import { namesAreEquivalent } from "@/features/pptx/fuzzy-name-match";

describe("namesAreEquivalent", () => {
  it("considera nomes idênticos equivalentes", () => {
    expect(namesAreEquivalent("Hotel Plaza", "Hotel Plaza")).toBe(true);
  });

  it("ignora diferenças de caixa, acentuação e espaçamento", () => {
    expect(namesAreEquivalent("Hotel  Água Azul", "hotel agua azul")).toBe(true);
  });

  it("tolera pequena divergência de grafia (caso relatado: Marriot x Marriott)", () => {
    expect(namesAreEquivalent("Quebec City Marriot Downtown", "Quebec City Marriott Downtown")).toBe(true);
  });

  it("não considera nomes de hotéis genuinamente diferentes como equivalentes", () => {
    expect(namesAreEquivalent("Hotel Plaza", "Hotel Copacabana")).toBe(false);
  });

  it("não considera nomes curtos mas distintos como equivalentes", () => {
    expect(namesAreEquivalent("Hotel A", "Hotel B")).toBe(false);
  });
});
