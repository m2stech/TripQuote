import type pptxgen from "pptxgenjs";

import { renderInternalHeader } from "@/features/pptx/slides/internal-header";
import type { PptxTheme } from "@/features/pptx/theme/extract-theme";
import { CONTENT_MARGIN_X, FONT_SANS, FONT_SERIF, SLIDE_WIDTH_IN, SNOW_COLORS } from "@/features/pptx/tokens";
import type { ResolvedImage } from "@/features/pptx/types";
import type { Inclusion } from "@/features/quotes/schemas/quote-form.schema";

export interface InclusionsSlideData {
  inclusions: Inclusion[];
  destinationTitle: string;
  destinationDescription: string;
  destinationAttractions: string[];
  agencyLogo: ResolvedImage;
  theme: PptxTheme;
}

const TITLE = "A experiência inclui os seguintes itens";

const CARD_W = 6.054;
const CARD_H = 1.083;
const CARD_GAP_X = 0.167;
const CARDS_START_Y = 1.639;
const CARD_ROW_GAP = 0.167;
const MAX_VISIBLE_ATTRACTIONS = 6;
const MIN_DESTINATION_BLOCK_H = 4.167;
const SLIDE_BOTTOM_MARGIN = 0.3;
/** Nº máximo de linhas de cards de inclusão que deixam espaço para o bloco "O destino" no mesmo slide. */
const MAX_INCLUSION_ROWS_WITH_DESTINATION = Math.floor(
  (7.5 - SLIDE_BOTTOM_MARGIN - 0.139 - MIN_DESTINATION_BLOCK_H - CARDS_START_Y) / (CARD_H + CARD_ROW_GAP),
);
/** Em um slide de continuação (só cards, sem bloco "O destino"), quantas linhas cabem até o rodapé do slide. */
const MAX_INCLUSION_ROWS_FULL_PAGE = Math.floor((7.5 - SLIDE_BOTTOM_MARGIN - CARDS_START_Y) / (CARD_H + CARD_ROW_GAP));

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

function renderDestinationBlock(
  slide: pptxgen.Slide,
  data: Pick<InclusionsSlideData, "destinationTitle" | "destinationDescription" | "destinationAttractions">,
  destinationBlockY: number,
  theme: PptxTheme,
): void {
  const destinationBlockH = Math.max(MIN_DESTINATION_BLOCK_H, 7.5 - destinationBlockY - SLIDE_BOTTOM_MARGIN);
  const destinationBlockW = SLIDE_WIDTH_IN - CONTENT_MARGIN_X * 2;

  slide.addShape("roundRect", {
    x: CONTENT_MARGIN_X,
    y: destinationBlockY,
    w: destinationBlockW,
    h: destinationBlockH,
    rectRadius: 0.05,
    fill: { color: theme.primary },
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
    fill: { color: theme.onPrimary },
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
    color: theme.onPrimary,
  });
  slide.addText(data.destinationTitle, {
    x: leftColX,
    y: destinationBlockY + 0.5,
    w: leftColW,
    h: 0.5,
    fontFace: FONT_SERIF,
    fontSize: 24,
    bold: true,
    color: theme.onPrimary,
  });
  slide.addText(data.destinationDescription, {
    x: leftColX,
    y: destinationBlockY + 1.1,
    w: leftColW,
    h: destinationBlockH - 1.4,
    fontFace: FONT_SANS,
    fontSize: 11.5,
    color: theme.onPrimary,
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
    color: theme.onPrimary,
  });

  data.destinationAttractions.slice(0, MAX_VISIBLE_ATTRACTIONS).forEach((attraction, index) => {
    const itemY = destinationBlockY + 0.597 + index * 0.528;
    slide.addShape("diamond", {
      x: rightColX,
      y: itemY + 0.05,
      w: 0.097,
      h: 0.097,
      fill: { color: theme.onPrimary },
      line: { type: "none" },
    });
    slide.addText(attraction, {
      x: rightColX + 0.222,
      y: itemY,
      w: rightColW - 0.222,
      h: 0.4,
      fontFace: FONT_SANS,
      fontSize: 11,
      color: theme.onPrimary,
    });
  });
}

/**
 * Inclusões (grid de cards numerados, 2 colunas) + bloco "O destino" com
 * descrição e atrativos pesquisados pela IA (`aiOutput`). Usa a capacidade
 * cheia do slide (até `MAX_INCLUSION_ROWS_FULL_PAGE` linhas) nas páginas
 * intermediárias, reservando só a última leva de inclusões para caber junto
 * com o bloco "O destino" no mesmo slide (`MAX_INCLUSION_ROWS_WITH_DESTINATION`,
 * menor) — nunca omite inclusões nem corta o bloco "destino" para fora dos
 * limites do slide, e nunca deixa poucas inclusões por página quando cabem
 * mais (bug relatado: a paginação inicial usava o limite pequeno também nas
 * páginas sem o bloco "destino", gerando páginas quase vazias).
 */
export function buildInclusionsSlide(pres: pptxgen, data: InclusionsSlideData): void {
  const totalRows = Math.ceil(data.inclusions.length / 2);

  if (totalRows <= MAX_INCLUSION_ROWS_WITH_DESTINATION) {
    const slide = pres.addSlide();
    renderInternalHeader(slide, data.agencyLogo, TITLE, data.theme);
    renderInclusionsPage(slide, data.inclusions, 0, data.theme);
    const destinationBlockY = CARDS_START_Y + totalRows * (CARD_H + CARD_ROW_GAP) + 0.139;
    renderDestinationBlock(slide, data, destinationBlockY, data.theme);
    return;
  }

  // Reserva a última página para caber com o bloco "O destino": todas as
  // páginas anteriores usam a capacidade cheia do slide (sem o bloco).
  const rowsForLastPage = ((totalRows - 1) % MAX_INCLUSION_ROWS_WITH_DESTINATION) + 1;
  const inclusionsForLastPage = Math.min(
    data.inclusions.length - (totalRows - rowsForLastPage) * 2,
    rowsForLastPage * 2,
  );
  const fullPagesInclusionCount = data.inclusions.length - inclusionsForLastPage;
  const inclusionsPerFullPage = MAX_INCLUSION_ROWS_FULL_PAGE * 2;

  for (let start = 0; start < fullPagesInclusionCount; start += inclusionsPerFullPage) {
    const page = data.inclusions.slice(start, start + inclusionsPerFullPage);
    const slide = pres.addSlide();
    renderInternalHeader(slide, data.agencyLogo, TITLE, data.theme);
    renderInclusionsPage(slide, page, start, data.theme);
  }

  const lastPage = data.inclusions.slice(fullPagesInclusionCount);
  const lastSlide = pres.addSlide();
  renderInternalHeader(lastSlide, data.agencyLogo, TITLE, data.theme);
  renderInclusionsPage(lastSlide, lastPage, fullPagesInclusionCount, data.theme);
  const lastPageRows = Math.ceil(lastPage.length / 2);
  const destinationBlockY = CARDS_START_Y + lastPageRows * (CARD_H + CARD_ROW_GAP) + 0.139;
  renderDestinationBlock(lastSlide, data, destinationBlockY, data.theme);
}
