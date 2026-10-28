import type pptxgen from "pptxgenjs";

import { renderInternalHeader } from "@/features/pptx/slides/internal-header";
import type { PptxTheme } from "@/features/pptx/theme/extract-theme";
import { CONTENT_MARGIN_X, FONT_SANS, SLIDE_HEIGHT_IN, SLIDE_WIDTH_IN, SNOW_COLORS } from "@/features/pptx/tokens";
import type { ResolvedImage } from "@/features/pptx/types";
import type { CruiseInclusions } from "@/features/quotes/schemas/cruise-form.schema";

export interface CruiseInclusionsSlideData {
  inclusions: CruiseInclusions;
  agencyLogo: ResolvedImage;
  theme: PptxTheme;
}

const TITLE = "O que está incluído";
const COLUMN_Y = 1.75;
const COLUMN_W = 3.736;
const GAP = 0.167;
const ITEM_H = 0.306;
const LIST_Y = COLUMN_Y + 0.556;
const SLIDE_BOTTOM_MARGIN = 0.3;

/**
 * Quantos itens cabem por coluna num slide cheio, do início da lista até o
 * rodapé — mesmo cálculo de `MAX_INCLUSION_ROWS_FULL_PAGE` no terrestre.
 * As 3 colunas são paginadas juntas (a mesma página avança para todas ao
 * mesmo tempo): a coluna mais longa dita quando criar um slide de
 * continuação, nunca omitindo itens das demais por estarem mais curtas.
 */
const MAX_ITEMS_PER_COLUMN_PER_PAGE = Math.floor((SLIDE_HEIGHT_IN - SLIDE_BOTTOM_MARGIN - LIST_Y) / ITEM_H);

interface Column {
  label: string;
  items: string[];
  accentColor: string;
  textColor: string;
}

function renderColumnHeader(slide: pptxgen.Slide, column: Column, x: number): void {
  slide.addShape("rect", {
    x,
    y: COLUMN_Y,
    w: COLUMN_W,
    h: 0.042,
    fill: { color: column.accentColor },
    line: { type: "none" },
  });
  slide.addText(column.label, {
    x,
    y: COLUMN_Y + 0.15,
    w: COLUMN_W,
    h: 0.25,
    fontFace: FONT_SANS,
    fontSize: 11,
    bold: true,
    color: column.textColor,
  });
}

function renderColumnPage(slide: pptxgen.Slide, column: Column, items: string[], x: number): void {
  renderColumnHeader(slide, column, x);

  items.forEach((item, index) => {
    const y = LIST_Y + index * ITEM_H;
    slide.addText(item, {
      x,
      y,
      w: COLUMN_W,
      h: ITEM_H,
      fontFace: FONT_SANS,
      fontSize: 11,
      color: SNOW_COLORS.body,
      valign: "top",
    });
  });
}

function buildCruiseInclusionsSlidePage(
  pres: pptxgen,
  data: CruiseInclusionsSlideData,
  columns: Column[],
  pageStart: number,
  isContinuation: boolean,
): void {
  const slide = pres.addSlide();
  renderInternalHeader(slide, data.agencyLogo, isContinuation ? `${TITLE} (continuação)` : TITLE, data.theme);

  columns.forEach((column, index) => {
    const x = CONTENT_MARGIN_X + index * (COLUMN_W + GAP);
    const page = column.items.slice(pageStart, pageStart + MAX_ITEMS_PER_COLUMN_PER_PAGE);
    renderColumnPage(slide, column, page, x);
  });

  if (!isContinuation && data.inclusions.importantInfo) {
    const infoY = SLIDE_HEIGHT_IN - 0.9;
    slide.addShape("rect", {
      x: CONTENT_MARGIN_X,
      y: infoY,
      w: SLIDE_WIDTH_IN - CONTENT_MARGIN_X * 2,
      h: 0.014,
      fill: { color: SNOW_COLORS.hairline },
      line: { type: "none" },
    });
    slide.addText(data.inclusions.importantInfo, {
      x: CONTENT_MARGIN_X,
      y: infoY + 0.1,
      w: SLIDE_WIDTH_IN - CONTENT_MARGIN_X * 2,
      h: 0.6,
      fontFace: FONT_SANS,
      fontSize: 10.5,
      italic: true,
      color: SNOW_COLORS.caption,
      valign: "top",
    });
  }
}

/**
 * Três colunas (incluído / não incluído / opcionais) + informações
 * importantes, se houver (só na 1ª página) — transcrição exata das listas
 * do formulário (seção 07), sem decisão da IA sobre o que entra em cada
 * coluna. Paginado por `MAX_ITEMS_PER_COLUMN_PER_PAGE`: nunca omite itens
 * por falta de espaço, mesmo princípio dos demais slides paginados do
 * builder de cruzeiro. Omitido por completo quando as 3 listas estão
 * vazias — a seção 07 é opcional no formulário.
 */
export function buildCruiseInclusionsSlide(pres: pptxgen, data: CruiseInclusionsSlideData): void {
  const columns: Column[] = [
    { label: "INCLUÍDO", items: data.inclusions.included, accentColor: data.theme.primary, textColor: data.theme.textOnLight },
    { label: "NÃO INCLUÍDO", items: data.inclusions.notIncluded, accentColor: SNOW_COLORS.hairlineDark, textColor: SNOW_COLORS.navy },
    { label: "OPCIONAIS", items: data.inclusions.optional, accentColor: SNOW_COLORS.hairlineDark, textColor: SNOW_COLORS.navy },
  ];

  const maxItems = Math.max(...columns.map((column) => column.items.length));
  if (maxItems === 0) return;

  for (let pageStart = 0; pageStart < maxItems; pageStart += MAX_ITEMS_PER_COLUMN_PER_PAGE) {
    buildCruiseInclusionsSlidePage(pres, data, columns, pageStart, pageStart > 0);
  }
}
