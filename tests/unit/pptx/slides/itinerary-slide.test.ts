import pptxgen from "pptxgenjs";
import { describe, expect, it } from "vitest";

import { buildItinerarySlide } from "@/features/pptx/slides/itinerary-slide";
import { getSlides, getSlideTexts } from "./test-helpers";

const baseData = {
  days: [
    { id: "1", label: "Dia 1 — 20/07", description: "Chegada e city tour" },
    { id: "2", label: "Dia 2 — 21/07", description: "Passeio à praia" },
  ],
  agencyLogo: { kind: "placeholder" as const },
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
});
