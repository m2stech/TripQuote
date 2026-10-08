import pptxgen from "pptxgenjs";
import { describe, expect, it } from "vitest";

import { buildFinalSlide } from "@/features/pptx/slides/final-slide";
import { FIXED_INSTITUTIONAL_FOOTER } from "@/features/quotes/schemas/quote-form.schema";
import { getSlideImageCount, getSlides, getSlideTexts } from "./test-helpers";

const PLACEHOLDER_DATA = {
  institutionalLogo: { kind: "placeholder" as const },
  institutionalFooterText: FIXED_INSTITUTIONAL_FOOTER,
};

describe("buildFinalSlide", () => {
  it("adiciona exatamente 1 slide", () => {
    const pres = new pptxgen();
    pres.layout = "LAYOUT_WIDE";
    buildFinalSlide(pres, PLACEHOLDER_DATA);
    expect(getSlides(pres)).toHaveLength(1);
  });

  it("inclui o título fixo e as 3 condições de pagamento", () => {
    const pres = new pptxgen();
    pres.layout = "LAYOUT_WIDE";
    buildFinalSlide(pres, PLACEHOLDER_DATA);
    const texts = getSlideTexts(getSlides(pres)[0]!);

    expect(texts).toContain("Condições de pagamento");
    expect(texts.some((t) => t.includes("Pagamento à vista"))).toBe(true);
    expect(texts.some((t) => t.includes("Cartão de Crédito"))).toBe(true);
    expect(texts.some((t) => t.includes("Boleto Bancário"))).toBe(true);
  });

  it("inclui a observação de valor mínimo por parcela", () => {
    const pres = new pptxgen();
    pres.layout = "LAYOUT_WIDE";
    buildFinalSlide(pres, PLACEHOLDER_DATA);
    const texts = getSlideTexts(getSlides(pres)[0]!);
    expect(texts.some((t) => t.includes("valor mínimo por parcela"))).toBe(true);
  });

  it("inclui as 3 informações importantes fixas", () => {
    const pres = new pptxgen();
    pres.layout = "LAYOUT_WIDE";
    buildFinalSlide(pres, PLACEHOLDER_DATA);
    const texts = getSlideTexts(getSlides(pres)[0]!);

    expect(texts).toContain("Tarifas e disponibilidade sujeitas à confirmação no momento da reserva.");
    expect(texts).toContain("Valores sujeitos a alteração até a efetivação da compra.");
    expect(texts).toContain("Serviços sujeitos às regras dos respectivos fornecedores.");
  });

  it("inclui o texto institucional recebido (rodapé)", () => {
    const pres = new pptxgen();
    pres.layout = "LAYOUT_WIDE";
    buildFinalSlide(pres, PLACEHOLDER_DATA);
    const texts = getSlideTexts(getSlides(pres)[0]!);
    expect(texts.some((t) => t.includes("SNOW Operadora"))).toBe(true);
  });

  it("sem logo institucional: nenhuma imagem; com logo: 1 imagem", () => {
    const pres = new pptxgen();
    pres.layout = "LAYOUT_WIDE";
    buildFinalSlide(pres, PLACEHOLDER_DATA);
    expect(getSlideImageCount(getSlides(pres)[0]!)).toBe(0);

    const pres2 = new pptxgen();
    pres2.layout = "LAYOUT_WIDE";
    buildFinalSlide(pres2, {
      institutionalLogo: { kind: "image", data: Buffer.from("fake"), sizing: { w: 0.6, h: 0.6 } },
      institutionalFooterText: FIXED_INSTITUTIONAL_FOOTER,
    });
    expect(getSlideImageCount(getSlides(pres2)[0]!)).toBe(1);
  });
});
