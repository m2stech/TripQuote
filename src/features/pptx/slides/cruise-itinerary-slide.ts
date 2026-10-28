import type pptxgen from "pptxgenjs";

import { renderInternalHeader } from "@/features/pptx/slides/internal-header";
import type { PptxTheme } from "@/features/pptx/theme/extract-theme";
import { CONTENT_MARGIN_X, FONT_SANS, SLIDE_WIDTH_IN, SNOW_COLORS } from "@/features/pptx/tokens";
import type { ResolvedImage } from "@/features/pptx/types";
import type { CruiseItineraryStop } from "@/features/quotes/schemas/cruise-form.schema";

export interface CruiseItinerarySlideData {
  stops: CruiseItineraryStop[];
  agencyLogo: ResolvedImage;
  theme: PptxTheme;
}

const TITLE = "Roteiro dia a dia";
const ROWS_START_Y = 1.75;
const ROW_H = 0.5;
const MAX_ROWS_PER_PAGE = 9;

const COLUMNS: Array<{ label: string; x: number; w: number }> = [
  { label: "DIA", x: 0, w: 0.6 },
  { label: "DATA", x: 0.6, w: 1.3 },
  { label: "PORTO/DESTINO", x: 1.9, w: 4.1 },
  { label: "OPERAÇÃO", x: 6, w: 1.8 },
  { label: "CHEGADA", x: 7.8, w: 1.5 },
  { label: "SAÍDA", x: 9.3, w: 1.5 },
];

function formatStopDate(value: string): string {
  const [year, month, day] = value.split("-");
  if (!year || !month || !day) return value;
  return `${day}/${month}`;
}

function renderHeaderRow(slide: pptxgen.Slide, theme: PptxTheme): void {
  COLUMNS.forEach((column) => {
    slide.addText(column.label, {
      x: CONTENT_MARGIN_X + column.x,
      y: ROWS_START_Y,
      w: column.w,
      h: 0.25,
      fontFace: FONT_SANS,
      fontSize: 8,
      bold: true,
      charSpacing: 1.2,
      color: SNOW_COLORS.label,
    });
  });
  slide.addShape("rect", {
    x: CONTENT_MARGIN_X,
    y: ROWS_START_Y + 0.278,
    w: SLIDE_WIDTH_IN - CONTENT_MARGIN_X * 2,
    h: 0.014,
    fill: { color: theme.accent },
    line: { type: "none" },
  });
}

function renderStopRow(slide: pptxgen.Slide, stop: CruiseItineraryStop, index: number, y: number, theme: PptxTheme): void {
  if (index % 2 === 1) {
    slide.addShape("rect", {
      x: CONTENT_MARGIN_X,
      y,
      w: SLIDE_WIDTH_IN - CONTENT_MARGIN_X * 2,
      h: ROW_H,
      fill: { color: SNOW_COLORS.card },
      line: { type: "none" },
    });
  }

  const values = [
    String(index + 1).padStart(2, "0"),
    formatStopDate(stop.date),
    stop.portOrDestination,
    stop.operation,
    stop.arrival || "—",
    stop.departure || "—",
  ];

  COLUMNS.forEach((column, columnIndex) => {
    slide.addText(values[columnIndex]!, {
      x: CONTENT_MARGIN_X + column.x + 0.1,
      y,
      w: column.w - 0.15,
      h: ROW_H,
      fontFace: FONT_SANS,
      fontSize: 11,
      bold: columnIndex === 0 || columnIndex === 3,
      color: columnIndex === 3 ? theme.textOnLight : SNOW_COLORS.body,
      valign: "middle",
    });
  });
}

function buildCruiseItinerarySlidePage(
  pres: pptxgen,
  data: CruiseItinerarySlideData,
  stops: CruiseItineraryStop[],
  startIndex: number,
  isContinuation: boolean,
): void {
  const slide = pres.addSlide();
  renderInternalHeader(slide, data.agencyLogo, isContinuation ? `${TITLE} (continuação)` : TITLE, data.theme);
  renderHeaderRow(slide, data.theme);

  stops.forEach((stop, offset) => {
    const y = ROWS_START_Y + 0.389 + offset * ROW_H;
    renderStopRow(slide, stop, startIndex + offset, y, data.theme);
  });
}

/**
 * Roteiro dia a dia do cruzeiro: tabela (dia/data/porto/operação/chegada/
 * saída), paginada em slides de continuação a cada `MAX_ROWS_PER_PAGE`
 * linhas — diferente do roteiro terrestre (texto livre por dia), aqui cada
 * linha é curta e uniforme, então a paginação é por contagem fixa, não por
 * altura estimada de texto.
 */
export function buildCruiseItinerarySlide(pres: pptxgen, data: CruiseItinerarySlideData): void {
  if (data.stops.length === 0) return;

  for (let start = 0; start < data.stops.length; start += MAX_ROWS_PER_PAGE) {
    const page = data.stops.slice(start, start + MAX_ROWS_PER_PAGE);
    buildCruiseItinerarySlidePage(pres, data, page, start, start > 0);
  }
}
