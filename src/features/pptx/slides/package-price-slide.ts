import type pptxgen from "pptxgenjs";

import { renderInternalHeader } from "@/features/pptx/slides/internal-header";
import type { PptxTheme } from "@/features/pptx/theme/extract-theme";
import { CONTENT_MARGIN_X, FONT_SANS, FONT_SERIF, SLIDE_HEIGHT_IN, SLIDE_WIDTH_IN } from "@/features/pptx/tokens";
import type { ResolvedImage } from "@/features/pptx/types";

export interface PackagePriceSlideData {
  packagePriceTotal: string;
  priceType: string;
  currency: string;
  agencyLogo: ResolvedImage;
  theme: PptxTheme;
}

const TITLE = "Valor do pacote";

/**
 * Modo circuito (`general.isCircuit`): o valor é único para todo o roteiro,
 * não por hotel — os slides de hotel seguintes (`buildHotelSlides`) omitem
 * o preço nos cards de acomodação para não insinuar um valor por cidade.
 * Slide dedicado, sempre entre Inclusões e Hotéis (padrão definido com o
 * cliente: valor total antes da lista de hospedagens orçadas).
 */
export function buildPackagePriceSlide(pres: pptxgen, data: PackagePriceSlideData): void {
  const slide = pres.addSlide();
  renderInternalHeader(slide, data.agencyLogo, TITLE, data.theme);

  const cardW = SLIDE_WIDTH_IN - CONTENT_MARGIN_X * 2;
  const cardH = 3.5;
  const cardY = (SLIDE_HEIGHT_IN - cardH) / 2 + 0.3;

  slide.addShape("roundRect", {
    x: CONTENT_MARGIN_X,
    y: cardY,
    w: cardW,
    h: cardH,
    rectRadius: 0.08,
    fill: { color: data.theme.primary },
    line: { type: "none" },
  });

  slide.addText("VALOR TOTAL DO PACOTE", {
    x: CONTENT_MARGIN_X,
    y: cardY + 0.5,
    w: cardW,
    h: 0.278,
    fontFace: FONT_SANS,
    fontSize: 13,
    bold: true,
    charSpacing: 2,
    color: data.theme.onPrimary,
    align: "center",
  });

  slide.addText(data.packagePriceTotal, {
    x: CONTENT_MARGIN_X,
    y: cardY + 1.0,
    w: cardW,
    h: 1.1,
    fontFace: FONT_SERIF,
    fontSize: 48,
    bold: true,
    color: data.theme.onPrimary,
    align: "center",
    valign: "middle",
  });

  slide.addText(`${data.priceType}, em ${data.currency}`, {
    x: CONTENT_MARGIN_X,
    y: cardY + 2.25,
    w: cardW,
    h: 0.333,
    fontFace: FONT_SANS,
    fontSize: 13,
    color: data.theme.onPrimary,
    align: "center",
  });

  slide.addText("Inclui todas as cidades e hospedagens apresentadas a seguir.", {
    x: CONTENT_MARGIN_X,
    y: cardY + 2.75,
    w: cardW,
    h: 0.278,
    fontFace: FONT_SANS,
    fontSize: 10.5,
    italic: true,
    color: data.theme.onPrimary,
    align: "center",
  });
}
