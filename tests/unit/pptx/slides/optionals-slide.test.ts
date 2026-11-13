import pptxgen from "pptxgenjs";
import { describe, expect, it } from "vitest";

import { buildOptionalsSlide, type OptionalItemWithPhoto } from "@/features/pptx/slides/optionals-slide";
import { DEFAULT_THEME } from "@/features/pptx/theme/extract-theme";
import { getSlides, getSlideTexts } from "./test-helpers";

function makeItem(overrides: Partial<OptionalItemWithPhoto["item"]> = {}): OptionalItemWithPhoto {
  return {
    item: { id: "1", title: "City tour", price: "R$ 450,00 por pessoa", description: "Passeio guiado.", photo: null, ...overrides },
    photo: { kind: "placeholder" },
  };
}

describe("buildOptionalsSlide", () => {
  it("sem itens: não gera nenhum slide", () => {
    const pres = new pptxgen();
    pres.layout = "LAYOUT_WIDE";
    buildOptionalsSlide(pres, { items: [], agencyLogo: { kind: "placeholder" }, theme: DEFAULT_THEME });

    expect(getSlides(pres)).toHaveLength(0);
  });

  it("poucos itens: 1 slide só, com título fixo e os dados do item", () => {
    const pres = new pptxgen();
    pres.layout = "LAYOUT_WIDE";
    buildOptionalsSlide(pres, {
      items: [makeItem()],
      agencyLogo: { kind: "placeholder" },
      theme: DEFAULT_THEME,
    });

    expect(getSlides(pres)).toHaveLength(1);
    const texts = getSlideTexts(getSlides(pres)[0]!);
    expect(texts).toContain("Opcionais");
    expect(texts).toContain("City tour");
    expect(texts).toContain("R$ 450,00 por pessoa");
    expect(texts).toContain("Passeio guiado.");
  });

  it("item sem título: usa o título padrão 'Opcional'", () => {
    const pres = new pptxgen();
    pres.layout = "LAYOUT_WIDE";
    buildOptionalsSlide(pres, {
      items: [makeItem({ title: "" })],
      agencyLogo: { kind: "placeholder" },
      theme: DEFAULT_THEME,
    });

    const texts = getSlideTexts(getSlides(pres)[0]!);
    expect(texts).toContain("Opcional");
  });

  it("mais de 3 itens: pagina em slides de continuação, sem omitir nenhum", () => {
    const pres = new pptxgen();
    pres.layout = "LAYOUT_WIDE";
    const items = Array.from({ length: 5 }, (_, i) => makeItem({ id: String(i), title: `Item ${i + 1}` }));
    buildOptionalsSlide(pres, { items, agencyLogo: { kind: "placeholder" }, theme: DEFAULT_THEME });

    const slides = getSlides(pres);
    expect(slides.length).toBe(2);
    const allTexts = slides.flatMap((slide) => getSlideTexts(slide));
    for (let i = 1; i <= 5; i += 1) {
      expect(allTexts).toContain(`Item ${i}`);
    }
    expect(getSlideTexts(slides[1]!)).toContain("Opcionais (continuação)");
  });

  it("descrição muito longa é truncada com reticências", () => {
    const pres = new pptxgen();
    pres.layout = "LAYOUT_WIDE";
    const longDescription = "A".repeat(500);
    buildOptionalsSlide(pres, {
      items: [makeItem({ description: longDescription })],
      agencyLogo: { kind: "placeholder" },
      theme: DEFAULT_THEME,
    });

    const texts = getSlideTexts(getSlides(pres)[0]!);
    expect(texts.some((text) => text.endsWith("…"))).toBe(true);
    expect(texts).not.toContain(longDescription);
  });
});
