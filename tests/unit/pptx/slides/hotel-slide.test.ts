import pptxgen from "pptxgenjs";
import { describe, expect, it } from "vitest";

import { buildHotelSlide, buildHotelSlides, type HotelSlideData } from "@/features/pptx/slides/hotel-slide";
import { getSlideImageCount, getSlides, getSlideTexts } from "./test-helpers";

function makeData(overrides: Partial<HotelSlideData> = {}): HotelSlideData {
  return {
    optionNumber: 1,
    name: "Hotel Plaza San Francisco",
    mealPlan: "Café da manhã",
    rooms: [{ id: "1", text: "Standard | R$ 10.000,00" }],
    shortDescription: "Hotel de luxo no centro da cidade.",
    location: "Las Condes, Santiago",
    category: "5 estrelas",
    tripadvisorRating: "4,5 de 5 (1.200 avaliações)",
    priceContext: "Por família, em Real brasileiro (R$)",
    photo: { kind: "placeholder" },
    photoSourceUrl: null,
    agencyLogo: { kind: "placeholder" },
    ...overrides,
  };
}

describe("buildHotelSlide", () => {
  it("adiciona exatamente 1 slide", () => {
    const pres = new pptxgen();
    pres.layout = "LAYOUT_WIDE";
    buildHotelSlide(pres, makeData());
    expect(getSlides(pres)).toHaveLength(1);
  });

  it("inclui o título fixo, o nome do hotel e o badge de opção", () => {
    const pres = new pptxgen();
    pres.layout = "LAYOUT_WIDE";
    buildHotelSlide(pres, makeData());
    const texts = getSlideTexts(getSlides(pres)[0]!);
    expect(texts).toContain("Escolha o hotel que melhor encaixa no seu perfil!");
    expect(texts).toContain("Hotel Plaza San Francisco");
    expect(texts).toContain("OPÇÃO 1");
  });

  it("inclui as 4 informações: localização, categoria, plano alimentar, tripadvisor", () => {
    const pres = new pptxgen();
    pres.layout = "LAYOUT_WIDE";
    buildHotelSlide(pres, makeData());
    const texts = getSlideTexts(getSlides(pres)[0]!);
    expect(texts).toContain("Las Condes, Santiago");
    expect(texts).toContain("5 estrelas");
    expect(texts).toContain("Café da manhã");
    expect(texts).toContain("4,5 de 5 (1.200 avaliações)");
  });

  it("inclui tipo de quarto e preço parseados do texto livre", () => {
    const pres = new pptxgen();
    pres.layout = "LAYOUT_WIDE";
    buildHotelSlide(pres, makeData());
    const texts = getSlideTexts(getSlides(pres)[0]!);
    expect(texts).toContain("Standard");
    expect(texts).toContain("R$ 10.000,00");
  });

  it("foto ausente: renderiza placeholder sem lançar erro, sem crédito de fonte", () => {
    const pres = new pptxgen();
    pres.layout = "LAYOUT_WIDE";
    expect(() => buildHotelSlide(pres, makeData())).not.toThrow();
    expect(getSlideImageCount(getSlides(pres)[0]!)).toBe(0);
  });

  it("foto real: adiciona 1 imagem", () => {
    const pres = new pptxgen();
    pres.layout = "LAYOUT_WIDE";
    buildHotelSlide(
      pres,
      makeData({ photo: { kind: "image", data: Buffer.from("fake"), sizing: { w: 5, h: 3.5 } } }),
    );
    expect(getSlideImageCount(getSlides(pres)[0]!)).toBe(1);
  });

  it("múltiplas acomodações geram mini-cards dinâmicos, todas presentes", () => {
    const pres = new pptxgen();
    pres.layout = "LAYOUT_WIDE";
    buildHotelSlide(
      pres,
      makeData({
        rooms: [
          { id: "1", text: "Standard | R$ 8.000,00" },
          { id: "2", text: "Luxo | R$ 11.000,00" },
          { id: "3", text: "Suíte | R$ 15.000,00" },
        ],
      }),
    );
    const texts = getSlideTexts(getSlides(pres)[0]!);
    expect(texts).toContain("Standard");
    expect(texts).toContain("Luxo");
    expect(texts).toContain("Suíte");
  });
});

describe("buildHotelSlides (continuação)", () => {
  it("hotel com poucas acomodações gera só 1 slide", () => {
    const pres = new pptxgen();
    pres.layout = "LAYOUT_WIDE";
    buildHotelSlides(pres, makeData());
    expect(getSlides(pres)).toHaveLength(1);
  });

  it("hotel com muitas acomodações (>6) gera slides de continuação, sem omitir nenhuma", () => {
    const pres = new pptxgen();
    pres.layout = "LAYOUT_WIDE";
    const rooms = Array.from({ length: 9 }, (_, i) => ({ id: String(i), text: `Tipo ${i + 1} | R$ ${i}00,00` }));
    buildHotelSlides(pres, makeData({ rooms }));

    expect(getSlides(pres).length).toBeGreaterThan(1);

    const allTexts = getSlides(pres).flatMap((slide) => getSlideTexts(slide));
    for (let i = 1; i <= 9; i += 1) {
      expect(allTexts).toContain(`Tipo ${i}`);
    }
  });

  it("slide de continuação usa o nome do hotel com sufixo '(continuação)'", () => {
    const pres = new pptxgen();
    pres.layout = "LAYOUT_WIDE";
    const rooms = Array.from({ length: 7 }, (_, i) => ({ id: String(i), text: `Tipo ${i + 1} | R$ 100,00` }));
    buildHotelSlides(pres, makeData({ rooms }));

    const allTexts = getSlides(pres).flatMap((slide) => getSlideTexts(slide));
    expect(allTexts).toContain("Hotel Plaza San Francisco (continuação)");
  });
});
