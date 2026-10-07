import type pptxgen from "pptxgenjs";

import { renderInternalHeader } from "@/features/pptx/slides/internal-header";
import { CONTENT_MARGIN_X, FONT_SANS, FONT_SERIF, SLIDE_WIDTH_IN, SNOW_COLORS } from "@/features/pptx/tokens";
import type { ResolvedImage } from "@/features/pptx/types";
import type { Inclusion } from "@/features/quotes/schemas/quote-form.schema";

export interface InclusionsSlideData {
  inclusions: Inclusion[];
  destinationTitle: string;
  destinationDescription: string;
  destinationAttractions: string[];
  agencyLogo: ResolvedImage;
}

const TITLE = "A experiência inclui os seguintes itens";

const CARD_W = 6.054;
const CARD_H = 1.083;
const CARD_GAP_X = 0.167;
const CARDS_START_Y = 1.639;
const CARD_ROW_GAP = 0.167;
const MAX_VISIBLE_ATTRACTIONS = 6;

function renderInclusionCard(
  slide: pptxgen.Slide,
  inclusion: Inclusion,
  index: number,
  x: number,
  y: number,
): void {
  slide.addShape("roundRect", {
    x,
    y,
    w: CARD_W,
    h: CARD_H,
    rectRadius: 0.1,
    fill: { color: SNOW_COLORS.card },
    line: { type: "none" },
  });

  const circleSize = 0.611;
  const circleX = x + 0.25;
  const circleY = y + 0.236;
  slide.addShape("ellipse", {
    x: circleX,
    y: circleY,
    w: circleSize,
    h: circleSize,
    fill: { color: SNOW_COLORS.navy },
    line: { type: "none" },
  });
  slide.addText(String(index + 1).padStart(2, "0"), {
    x: circleX,
    y: circleY,
    w: circleSize,
    h: circleSize,
    fontFace: FONT_SANS,
    fontSize: 14,
    bold: true,
    color: SNOW_COLORS.white,
    align: "center",
    valign: "middle",
  });

  const textX = circleX + circleSize + 0.222;
  slide.addText(`INCLUSÃO ${index + 1}`, {
    x: textX,
    y: y + 0.25,
    w: CARD_W - (textX - x) - 0.2,
    h: 0.167,
    fontFace: FONT_SANS,
    fontSize: 8,
    bold: true,
    charSpacing: 1.8,
    color: SNOW_COLORS.label,
  });
  slide.addText(inclusion.text, {
    x: textX,
    y: y + 0.472,
    w: CARD_W - (textX - x) - 0.2,
    h: 0.472,
    fontFace: FONT_SANS,
    fontSize: 15,
    bold: true,
    color: SNOW_COLORS.navy,
  });
}

/**
 * Inclusões (grid de cards numerados, 2 colunas, crescendo em linhas
 * conforme a quantidade — "nunca omitir por falta de espaço") + bloco "O
 * destino" com descrição e atrativos pesquisados pela IA (`aiOutput`).
 */
export function buildInclusionsSlide(pres: pptxgen, data: InclusionsSlideData): void {
  const slide = pres.addSlide();
  renderInternalHeader(slide, data.agencyLogo, TITLE);

  data.inclusions.forEach((inclusion, index) => {
    const column = index % 2;
    const row = Math.floor(index / 2);
    const x = CONTENT_MARGIN_X + column * (CARD_W + CARD_GAP_X);
    const y = CARDS_START_Y + row * (CARD_H + CARD_ROW_GAP);
    renderInclusionCard(slide, inclusion, index, x, y);
  });

  const rows = Math.ceil(data.inclusions.length / 2);
  const destinationBlockY = CARDS_START_Y + rows * (CARD_H + CARD_ROW_GAP) + 0.139;
  const destinationBlockH = Math.max(4.167, 7.5 - destinationBlockY - 0.3);
  const destinationBlockW = SLIDE_WIDTH_IN - CONTENT_MARGIN_X * 2;

  slide.addShape("roundRect", {
    x: CONTENT_MARGIN_X,
    y: destinationBlockY,
    w: destinationBlockW,
    h: destinationBlockH,
    rectRadius: 0.05,
    fill: { color: SNOW_COLORS.navy },
    line: { type: "none" },
  });

  const leftColX = CONTENT_MARGIN_X + 0.333;
  const leftColW = destinationBlockW * 0.46;
  const dividerX = CONTENT_MARGIN_X + destinationBlockW * 0.457;
  const rightColX = dividerX + 0.5;
  const rightColW = destinationBlockW - (rightColX - CONTENT_MARGIN_X) - 0.333;

  slide.addShape("rect", {
    x: dividerX,
    y: destinationBlockY + 0.333,
    w: 0.014,
    h: destinationBlockH - 0.667,
    fill: { color: SNOW_COLORS.hairlineDark },
    line: { type: "none" },
  });

  slide.addText("O DESTINO", {
    x: leftColX,
    y: destinationBlockY + 0.278,
    w: leftColW,
    h: 0.167,
    fontFace: FONT_SANS,
    fontSize: 9,
    bold: true,
    charSpacing: 1.8,
    color: SNOW_COLORS.hairline,
  });
  slide.addText(data.destinationTitle, {
    x: leftColX,
    y: destinationBlockY + 0.5,
    w: leftColW,
    h: 0.5,
    fontFace: FONT_SERIF,
    fontSize: 24,
    bold: true,
    color: SNOW_COLORS.white,
  });
  slide.addText(data.destinationDescription, {
    x: leftColX,
    y: destinationBlockY + 1.1,
    w: leftColW,
    h: destinationBlockH - 1.4,
    fontFace: FONT_SANS,
    fontSize: 11.5,
    color: SNOW_COLORS.hairline,
    lineSpacingMultiple: 1.08,
  });

  slide.addText("PRINCIPAIS ATRATIVOS", {
    x: rightColX,
    y: destinationBlockY + 0.278,
    w: rightColW,
    h: 0.167,
    fontFace: FONT_SANS,
    fontSize: 9,
    bold: true,
    charSpacing: 1.8,
    color: SNOW_COLORS.hairline,
  });

  data.destinationAttractions.slice(0, MAX_VISIBLE_ATTRACTIONS).forEach((attraction, index) => {
    const itemY = destinationBlockY + 0.597 + index * 0.528;
    slide.addShape("diamond", {
      x: rightColX,
      y: itemY + 0.05,
      w: 0.097,
      h: 0.097,
      fill: { color: SNOW_COLORS.hairline },
      line: { type: "none" },
    });
    slide.addText(attraction, {
      x: rightColX + 0.222,
      y: itemY,
      w: rightColW - 0.222,
      h: 0.4,
      fontFace: FONT_SANS,
      fontSize: 11,
      color: SNOW_COLORS.white,
    });
  });
}
