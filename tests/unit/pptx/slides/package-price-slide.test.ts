import pptxgen from "pptxgenjs";
import { describe, expect, it } from "vitest";

import { buildPackagePriceSlide, type PackagePriceSlideData } from "@/features/pptx/slides/package-price-slide";
import { DEFAULT_THEME } from "@/features/pptx/theme/extract-theme";
import { getSlides, getSlideTexts } from "./test-helpers";

function makeData(overrides: Partial<PackagePriceSlideData> = {}): PackagePriceSlideData {
  return {
    packagePriceTotal: "R$ 12.500,00",
    priceType: "Por família",
    currency: "Real brasileiro (R$)",
    agencyLogo: { kind: "placeholder" },
    theme: DEFAULT_THEME,
    ...overrides,
  };
}

describe("buildPackagePriceSlide", () => {
  it("adiciona exatamente 1 slide", () => {
    const pres = new pptxgen();
    pres.layout = "LAYOUT_WIDE";
    buildPackagePriceSlide(pres, makeData());
    expect(getSlides(pres)).toHaveLength(1);
  });

  it("inclui o título, o valor total e a condição (tipo de valor + moeda)", () => {
    const pres = new pptxgen();
    pres.layout = "LAYOUT_WIDE";
    buildPackagePriceSlide(pres, makeData());
    const texts = getSlideTexts(getSlides(pres)[0]!);
    expect(texts).toContain("Valor do pacote");
    expect(texts).toContain("R$ 12.500,00");
    expect(texts).toContain("Por família, em Real brasileiro (R$)");
  });
});
