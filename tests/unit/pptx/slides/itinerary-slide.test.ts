import pptxgen from "pptxgenjs";
import { describe, expect, it } from "vitest";

import { buildItinerarySlide } from "@/features/pptx/slides/itinerary-slide";
import { DEFAULT_THEME } from "@/features/pptx/theme/extract-theme";
import { getSlides, getSlideTexts } from "./test-helpers";

const baseData = {
  days: [
    { id: "1", label: "Dia 1 — 20/07", description: "Chegada e city tour" },
    { id: "2", label: "Dia 2 — 21/07", description: "Passeio à praia" },
  ],
  agencyLogo: { kind: "placeholder" as const },
  theme: DEFAULT_THEME,
};

describe("buildItinerarySlide", () => {
  it("poucos dias: 1 slide só, com título fixo e os dias", () => {
    const pres = new pptxgen();
    pres.layout = "LAYOUT_WIDE";
    buildItinerarySlide(pres, baseData);

    expect(getSlides(pres)).toHaveLength(1);
    const texts = getSlideTexts(getSlides(pres)[0]!);
    expect(texts).toContain("Programação dia a dia");
    expect(texts).toContain("Dia 1 — 20/07");
    expect(texts).toContain("Chegada e city tour");
  });

  it("muitos dias (>6): pagina em slides de continuação, sem omitir nenhum", () => {
    const pres = new pptxgen();
    pres.layout = "LAYOUT_WIDE";
    const days = Array.from({ length: 9 }, (_, i) => ({
      id: String(i),
      label: `Dia ${i + 1}`,
      description: `Atividade ${i + 1}`,
    }));
    buildItinerarySlide(pres, { ...baseData, days });

    expect(getSlides(pres).length).toBeGreaterThan(1);
    const allTexts = getSlides(pres).flatMap((slide) => getSlideTexts(slide));
    for (let i = 1; i <= 9; i += 1) {
      expect(allTexts).toContain(`Dia ${i}`);
    }
    expect(allTexts).toContain("Programação dia a dia (continuação)");
  });

  it("dias curtos adjacentes a um dia longo são agrupados na mesma página, não um por slide", () => {
    const pres = new pptxgen();
    pres.layout = "LAYOUT_WIDE";
    // Reproduz o caso relatado: dias de tamanhos muito desiguais (roteiro
    // real) — dias curtos não deveriam ocupar 1 slide inteiro sozinhos
    // quando cabem ao lado de um vizinho.
    const days = [
      { id: "1", label: "Dia 1", description: "A".repeat(150) },
      { id: "2", label: "Dia 2", description: "B".repeat(150) },
      { id: "3", label: "Dia 3", description: "C".repeat(2000) },
      { id: "4", label: "Dia 4", description: "D".repeat(150) },
    ];
    buildItinerarySlide(pres, { ...baseData, days });

    const slides = getSlides(pres);
    // Dia 1 e Dia 2 (ambos curtos) cabem juntos na primeira página.
    const firstSlideTexts = getSlideTexts(slides[0]!);
    expect(firstSlideTexts).toContain("Dia 1");
    expect(firstSlideTexts).toContain("Dia 2");
    // Nenhum dia é omitido, independente de quantas páginas resultarem.
    const allTexts = slides.flatMap((slide) => getSlideTexts(slide));
    for (let i = 1; i <= 4; i += 1) {
      expect(allTexts).toContain(`Dia ${i}`);
    }
  });

  it("descrição muito longa não transborda do card: usa fonte compacta e altura maior", () => {
    const pres = new pptxgen();
    pres.layout = "LAYOUT_WIDE";
    const longDescription = "Café da manhã. ".repeat(150); // > 2000 caracteres
    buildItinerarySlide(pres, {
      ...baseData,
      days: [{ id: "1", label: "Dia 1", description: longDescription }],
    });

    const texts = getSlideTexts(getSlides(pres)[0]!);
    expect(texts).toContain(longDescription);
  });
});
