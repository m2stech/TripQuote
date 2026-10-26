import type pptxgen from "pptxgenjs";

import { renderInternalHeader } from "@/features/pptx/slides/internal-header";
import type { PptxTheme } from "@/features/pptx/theme/extract-theme";
import { CONTENT_MARGIN_X, FONT_SANS, SNOW_COLORS } from "@/features/pptx/tokens";
import type { ResolvedImage } from "@/features/pptx/types";
import type { Inclusion } from "@/features/quotes/schemas/quote-form.schema";

export interface InclusionsSlideData {
  inclusions: Inclusion[];
  agencyLogo: ResolvedImage;
  theme: PptxTheme;
}

const TITLE = "A experiência inclui os seguintes itens";

const CARD_W = 6.054;
const CARD_H = 1.083;
const CARD_GAP_X = 0.167;
const CARDS_START_Y = 1.639;
const CARD_ROW_GAP = 0.167;
const SLIDE_BOTTOM_MARGIN = 0.3;
/** Quantas linhas de cards de inclusão cabem num slide cheio, do topo até o rodapé. */
const MAX_INCLUSION_ROWS_FULL_PAGE = Math.floor((7.5 - SLIDE_BOTTOM_MARGIN - CARDS_START_Y) / (CARD_H + CARD_ROW_GAP));
const INCLUSIONS_PER_FULL_PAGE = MAX_INCLUSION_ROWS_FULL_PAGE * 2;

function renderInclusionCard(
  slide: pptxgen.Slide,
  inclusion: Inclusion,
  index: number,
  x: number,
  y: number,
  theme: PptxTheme,
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
    fill: { color: theme.primary },
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
    color: theme.onPrimary,
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
    color: theme.textOnLight,
  });
}

function renderInclusionsPage(
  slide: pptxgen.Slide,
  inclusions: Inclusion[],
  startIndex: number,
  theme: PptxTheme,
): void {
  inclusions.forEach((inclusion, offset) => {
    const index = startIndex + offset;
    const column = offset % 2;
    const row = Math.floor(offset / 2);
    const x = CONTENT_MARGIN_X + column * (CARD_W + CARD_GAP_X);
    const y = CARDS_START_Y + row * (CARD_H + CARD_ROW_GAP);
    renderInclusionCard(slide, inclusion, index, x, y, theme);
  });
}

/**
 * Inclusões (grid de cards numerados, 2 colunas), paginadas em slides cheios
 * de até `MAX_INCLUSION_ROWS_FULL_PAGE` linhas cada. O bloco "O destino" que
 * antes dividia slide com a última leva de inclusões agora é um slide próprio
 * (`destination-slide.ts`), sempre logo após a capa — pedido do cliente, que
 * é sobre o destino da viagem, não sobre o que está incluído no pacote.
 */
export function buildInclusionsSlide(pres: pptxgen, data: InclusionsSlideData): void {
  const total = data.inclusions.length;
  if (total === 0) return;

  for (let start = 0; start < total; start += INCLUSIONS_PER_FULL_PAGE) {
    const end = Math.min(start + INCLUSIONS_PER_FULL_PAGE, total);
    const page = data.inclusions.slice(start, end);
    const slide = pres.addSlide();
    renderInternalHeader(slide, data.agencyLogo, TITLE, data.theme);
    renderInclusionsPage(slide, page, start, data.theme);
  }
}
