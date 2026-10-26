import type pptxgen from "pptxgenjs";

import { renderInternalHeader } from "@/features/pptx/slides/internal-header";
import type { PptxTheme } from "@/features/pptx/theme/extract-theme";
import { CONTENT_MARGIN_X, FONT_SANS, FONT_SERIF, SLIDE_HEIGHT_IN, SLIDE_WIDTH_IN } from "@/features/pptx/tokens";
import type { ResolvedImage } from "@/features/pptx/types";

export interface DestinationSlideData {
  destinationTitle: string;
  destinationDescription: string;
  destinationAttractions: string[];
  agencyLogo: ResolvedImage;
  theme: PptxTheme;
}

const TITLE = "O destino";
const MAX_VISIBLE_ATTRACTIONS = 6;
const BLOCK_Y = 1.639;
const SLIDE_BOTTOM_MARGIN = 0.4;

/**
 * Slide dedicado ao destino (descrição + principais atrativos), sempre
 * posicionado logo após a capa (2º slide) — separado das inclusões, que têm
 * conteúdo e finalidade diferentes. Antes esse bloco dividia slide com os
 * cards de inclusão e aparecia só no fim dessa sequência; o cliente pediu
 * que viesse como a segunda página do orçamento, e que o box tivesse mais
 * respiro vertical (texto da descrição ficava colado à base do card).
 */
export function buildDestinationSlide(pres: pptxgen, data: DestinationSlideData): void {
  const slide = pres.addSlide();
  renderInternalHeader(slide, data.agencyLogo, TITLE, data.theme);

  const blockH = SLIDE_HEIGHT_IN - BLOCK_Y - SLIDE_BOTTOM_MARGIN;
  const blockW = SLIDE_WIDTH_IN - CONTENT_MARGIN_X * 2;

  slide.addShape("roundRect", {
    x: CONTENT_MARGIN_X,
    y: BLOCK_Y,
    w: blockW,
    h: blockH,
    rectRadius: 0.05,
    fill: { color: data.theme.primary },
    line: { type: "none" },
  });

  const leftColX = CONTENT_MARGIN_X + 0.333;
  const leftColW = blockW * 0.46;
  const dividerX = CONTENT_MARGIN_X + blockW * 0.457;
  const rightColX = dividerX + 0.5;
  const rightColW = blockW - (rightColX - CONTENT_MARGIN_X) - 0.333;

  slide.addShape("rect", {
    x: dividerX,
    y: BLOCK_Y + 0.333,
    w: 0.014,
    h: blockH - 0.667,
    fill: { color: data.theme.onPrimary },
    line: { type: "none" },
  });

  slide.addText("O DESTINO", {
    x: leftColX,
    y: BLOCK_Y + 0.333,
    w: leftColW,
    h: 0.167,
    fontFace: FONT_SANS,
    fontSize: 9,
    bold: true,
    charSpacing: 1.8,
    color: data.theme.onPrimary,
  });
  slide.addText(data.destinationTitle, {
    x: leftColX,
    y: BLOCK_Y + 0.611,
    w: leftColW,
    h: 0.556,
    fontFace: FONT_SERIF,
    fontSize: 26,
    bold: true,
    color: data.theme.onPrimary,
  });
  slide.addText(data.destinationDescription, {
    x: leftColX,
    y: BLOCK_Y + 1.333,
    w: leftColW,
    h: blockH - 1.333 - 0.5,
    fontFace: FONT_SANS,
    fontSize: 12.5,
    color: data.theme.onPrimary,
    lineSpacingMultiple: 1.25,
    valign: "top",
  });

  slide.addText("PRINCIPAIS ATRATIVOS", {
    x: rightColX,
    y: BLOCK_Y + 0.333,
    w: rightColW,
    h: 0.167,
    fontFace: FONT_SANS,
    fontSize: 9,
    bold: true,
    charSpacing: 1.8,
    color: data.theme.onPrimary,
  });

  data.destinationAttractions.slice(0, MAX_VISIBLE_ATTRACTIONS).forEach((attraction, index) => {
    const itemY = BLOCK_Y + 0.694 + index * 0.597;
    slide.addShape("diamond", {
      x: rightColX,
      y: itemY + 0.06,
      w: 0.097,
      h: 0.097,
      fill: { color: data.theme.onPrimary },
      line: { type: "none" },
    });
    slide.addText(attraction, {
      x: rightColX + 0.222,
      y: itemY,
      w: rightColW - 0.222,
      h: 0.45,
      fontFace: FONT_SANS,
      fontSize: 12,
      color: data.theme.onPrimary,
      valign: "top",
    });
  });
}
