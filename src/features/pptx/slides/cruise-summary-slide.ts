import type pptxgen from "pptxgenjs";

import { renderInternalHeader } from "@/features/pptx/slides/internal-header";
import type { PptxTheme } from "@/features/pptx/theme/extract-theme";
import { CONTENT_MARGIN_X, FONT_SANS, FONT_SERIF, SLIDE_WIDTH_IN, SNOW_COLORS } from "@/features/pptx/tokens";
import type { ResolvedImage } from "@/features/pptx/types";

export interface CruiseSummarySlideData {
  shipName: string;
  cruiseLine: string;
  period: string;
  destination: string;
  embarkationPort: string;
  disembarkationPort: string;
  tripProfile: string;
  occupancy: string;
  tripSummary: string;
  agencyLogo: ResolvedImage;
  theme: PptxTheme;
}

const TITLE = "A viagem em resumo";

const CARD_WIDTHS = [3.736, 3.736, 3.736];
const CARD_H = 1.139;
const CARDS_Y = 1.75;
const GAP = 0.167;

/**
 * Resumo comercial da viagem (2º slide do .pptx de cruzeiro): 6 dados-chave
 * em 3 cards (navio/companhia, período, portos) + texto de resumo redigido
 * pela IA (`tripSummary`) abaixo — mesmo padrão visual dos cards de info do
 * hotel terrestre (`renderInfoCards`), adaptado para um layout de 3 colunas.
 */
export function buildCruiseSummarySlide(pres: pptxgen, data: CruiseSummarySlideData): void {
  const slide = pres.addSlide();
  renderInternalHeader(slide, data.agencyLogo, TITLE, data.theme);

  const cards: Array<{ label: string; value: string; secondaryLabel: string; secondaryValue: string }> = [
    { label: "NAVIO", value: data.shipName, secondaryLabel: "COMPANHIA", secondaryValue: data.cruiseLine },
    { label: "PERÍODO", value: data.period, secondaryLabel: "PERFIL", secondaryValue: data.tripProfile || "Não informado" },
    {
      label: "EMBARQUE",
      value: data.embarkationPort,
      secondaryLabel: "DESEMBARQUE",
      secondaryValue: data.disembarkationPort || data.embarkationPort,
    },
  ];

  let x = CONTENT_MARGIN_X;
  cards.forEach((card, index) => {
    const w = CARD_WIDTHS[index]!;
    slide.addShape("roundRect", {
      x,
      y: CARDS_Y,
      w,
      h: CARD_H,
      rectRadius: 0.08,
      fill: { color: SNOW_COLORS.card },
      line: { type: "none" },
    });
    slide.addShape("rect", {
      x,
      y: CARDS_Y,
      w: 0.042,
      h: CARD_H,
      fill: { color: data.theme.primary },
      line: { type: "none" },
    });
    slide.addText(card.label, {
      x: x + 0.18,
      y: CARDS_Y + 0.14,
      w: w - 0.33,
      h: 0.167,
      fontFace: FONT_SANS,
      fontSize: 8,
      bold: true,
      charSpacing: 1.8,
      color: SNOW_COLORS.label,
    });
    slide.addText(card.value, {
      x: x + 0.18,
      y: CARDS_Y + 0.35,
      w: w - 0.33,
      h: 0.3,
      fontFace: FONT_SERIF,
      fontSize: 15,
      bold: true,
      color: data.theme.textOnLight,
    });
    slide.addText(card.secondaryLabel, {
      x: x + 0.18,
      y: CARDS_Y + 0.68,
      w: w - 0.33,
      h: 0.167,
      fontFace: FONT_SANS,
      fontSize: 8,
      bold: true,
      charSpacing: 1.8,
      color: SNOW_COLORS.label,
    });
    slide.addText(card.secondaryValue, {
      x: x + 0.18,
      y: CARDS_Y + 0.87,
      w: w - 0.33,
      h: 0.22,
      fontFace: FONT_SANS,
      fontSize: 11,
      color: SNOW_COLORS.body,
    });
    x += w + GAP;
  });

  slide.addText("SOBRE ESTA VIAGEM", {
    x: CONTENT_MARGIN_X,
    y: CARDS_Y + CARD_H + 0.389,
    w: SLIDE_WIDTH_IN - CONTENT_MARGIN_X * 2,
    h: 0.167,
    fontFace: FONT_SANS,
    fontSize: 9,
    bold: true,
    charSpacing: 1.8,
    color: SNOW_COLORS.label,
  });
  slide.addText(data.tripSummary, {
    x: CONTENT_MARGIN_X,
    y: CARDS_Y + CARD_H + 0.639,
    w: SLIDE_WIDTH_IN - CONTENT_MARGIN_X * 2,
    h: 2.2,
    fontFace: FONT_SANS,
    fontSize: 14,
    color: SNOW_COLORS.body,
    lineSpacingMultiple: 1.25,
    valign: "top",
  });
}
