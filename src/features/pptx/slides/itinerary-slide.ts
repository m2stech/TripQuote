import type pptxgen from "pptxgenjs";

import { renderInternalHeader } from "@/features/pptx/slides/internal-header";
import type { PptxTheme } from "@/features/pptx/theme/extract-theme";
import { CONTENT_MARGIN_X, FONT_SANS, SLIDE_WIDTH_IN, SNOW_COLORS } from "@/features/pptx/tokens";
import type { ResolvedImage } from "@/features/pptx/types";
import type { ItineraryDay } from "@/features/quotes/schemas/quote-form.schema";

export interface ItinerarySlideData {
  days: ItineraryDay[];
  agencyLogo: ResolvedImage;
  theme: PptxTheme;
}

const TITLE = "Programação dia a dia";
const ROWS_START_Y = 1.639;
const SLIDE_BOTTOM_MARGIN = 0.3;
const ROW_PADDING = 0.2;
const ROW_GAP = 0.1;
const MIN_ROW_H = 0.65;
const LABEL_W = 2;
const DESCRIPTION_X_OFFSET = 2.3;
const DESCRIPTION_W = SLIDE_WIDTH_IN - CONTENT_MARGIN_X * 2 - 2.5;
/** Estimativa de caracteres por linha para o corpo da descrição (fontSize 11, FONT_SANS). */
const CHARS_PER_LINE = 95;
const LINE_HEIGHT_IN = 0.2;

/**
 * Estima a altura necessária para o card de um dia a partir do tamanho da
 * descrição — descrições longas (comuns em roteiros detalhados) não cabem
 * na altura fixa original, cortando texto (bug relatado). Cresce com o
 * texto em vez de assumir uma altura única para todo dia.
 */
function estimateRowHeight(description: string): number {
  const lineCount = Math.max(1, Math.ceil(description.length / CHARS_PER_LINE));
  return Math.max(MIN_ROW_H, ROW_PADDING * 2 + lineCount * LINE_HEIGHT_IN);
}

function renderDay(slide: pptxgen.Slide, day: ItineraryDay, y: number, rowH: number, theme: PptxTheme): void {
  slide.addShape("roundRect", {
    x: CONTENT_MARGIN_X,
    y,
    w: SLIDE_WIDTH_IN - CONTENT_MARGIN_X * 2,
    h: rowH,
    rectRadius: 0.06,
    fill: { color: SNOW_COLORS.card },
    line: { type: "none" },
  });
  slide.addText(day.label, {
    x: CONTENT_MARGIN_X + 0.2,
    y,
    w: LABEL_W,
    h: rowH,
    fontFace: FONT_SANS,
    fontSize: 12,
    bold: true,
    color: theme.textOnLight,
    valign: "top",
  });
  slide.addText(day.description, {
    x: CONTENT_MARGIN_X + DESCRIPTION_X_OFFSET,
    y: y + ROW_PADDING,
    w: DESCRIPTION_W,
    h: rowH - ROW_PADDING * 2,
    fontFace: FONT_SANS,
    fontSize: 11,
    color: SNOW_COLORS.body,
    valign: "top",
    lineSpacingMultiple: 1.08,
  });
}

/**
 * Agrupa os dias em páginas respeitando a altura disponível do slide
 * (altura estimada por dia, não um número fixo de dias) — nunca omite dias,
 * e nunca deixa um dia sozinho maior que a página (nesse caso ele mesmo
 * ocupa a página inteira, truncamento é preferível a quebrar o layout).
 */
function paginateDays(days: ItineraryDay[]): ItineraryDay[][] {
  const maxPageHeight = 7.5 - SLIDE_BOTTOM_MARGIN - ROWS_START_Y;
  const pages: ItineraryDay[][] = [];
  let currentPage: ItineraryDay[] = [];
  let currentHeight = 0;

  for (const day of days) {
    const rowH = estimateRowHeight(day.description) + ROW_GAP;
    if (currentPage.length > 0 && currentHeight + rowH > maxPageHeight) {
      pages.push(currentPage);
      currentPage = [];
      currentHeight = 0;
    }
    currentPage.push(day);
    currentHeight += rowH;
  }
  if (currentPage.length > 0) pages.push(currentPage);

  return pages;
}

function buildItinerarySlidePage(pres: pptxgen, data: ItinerarySlideData, days: ItineraryDay[], isContinuation: boolean): void {
  const slide = pres.addSlide();
  renderInternalHeader(slide, data.agencyLogo, isContinuation ? `${TITLE} (continuação)` : TITLE, data.theme);

  let y = ROWS_START_Y;
  for (const day of days) {
    const rowH = estimateRowHeight(day.description);
    renderDay(slide, day, y, rowH, data.theme);
    y += rowH + ROW_GAP;
  }
}

/**
 * Roteiro dia a dia (seção opcional do formulário): sem exemplo em
 * `Orcamento_modelo.pptx` (vazio nesse orçamento específico), segue a
 * paleta revisada por consistência. Pagina em slides de continuação
 * conforme a altura real do texto de cada dia, nunca omitindo nem cortando
 * descrições longas (bug relatado: dias com muito texto ficavam bagunçados
 * quando a paginação era só por contagem fixa de dias por slide).
 */
export function buildItinerarySlide(pres: pptxgen, data: ItinerarySlideData): void {
  const pages = paginateDays(data.days);
  pages.forEach((page, index) => {
    buildItinerarySlidePage(pres, data, page, index > 0);
  });
}
