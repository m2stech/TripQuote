import type pptxgen from "pptxgenjs";

import { parseFlightLeg } from "@/features/pptx/parse-flight-leg";
import { renderInternalHeader } from "@/features/pptx/slides/internal-header";
import type { PptxTheme } from "@/features/pptx/theme/extract-theme";
import { CONTENT_MARGIN_X, FONT_SANS, FONT_SERIF, SNOW_COLORS } from "@/features/pptx/tokens";
import type { ResolvedImage } from "@/features/pptx/types";

export interface FlightsSlideData {
  legs: string;
  baggage: string;
  seat: string;
  services: string;
  agencyLogo: ResolvedImage;
  theme: PptxTheme;
}

const TITLE = "Voos contemplados no orçamento";
const TABLE_Y = 1.639;
const COLUMN_WIDTHS = [1.25, 2.083, 2.083, 3.431, 3.431];
const ROW_H = 0.583;
const CARDS_Y = 4.861;
/** Nº máximo de trechos (linhas de dados, sem contar o header) que cabem no slide sem sobrepor os cards de bagagem/assento/serviços. */
const MAX_LEGS_WITH_CARDS = Math.floor((CARDS_Y - TABLE_Y) / ROW_H) - 1;
/** Em um slide de continuação (só tabela, sem cards), a tabela pode ocupar até o rodapé do slide. */
const MAX_LEGS_FULL_PAGE = Math.floor((7.5 - 0.3 - TABLE_Y) / ROW_H) - 1;

function buildTableRows(legs: string[], theme: PptxTheme): pptxgen.TableRow[] {
  const parsedLegs = legs.map((leg, index) => parseFlightLeg(leg, index));
  const allParsed = parsedLegs.every((leg) => leg !== null);

  const headerFill = { color: theme.primary };
  const headerText = { color: theme.onPrimary, bold: true, fontFace: FONT_SANS, fontSize: 11 };
  const cellBorder = { type: "solid" as const, color: SNOW_COLORS.hairline, pt: 0.5 };

  if (!allParsed) {
    const headerRow: pptxgen.TableRow = [
      { text: "Trecho", options: { fill: headerFill, ...headerText, border: cellBorder } },
    ];
    const dataRows: pptxgen.TableRow[] = legs.map((leg) => [
      { text: leg, options: { border: cellBorder, fontFace: FONT_SANS, fontSize: 12 } },
    ]);
    return [headerRow, ...dataRows];
  }

  const headers = ["Voo", "Saída", "Chegada", "Origem", "Destino"];
  const headerRow: pptxgen.TableRow = headers.map((text) => ({
    text,
    options: { fill: headerFill, ...headerText, border: cellBorder },
  }));

  const dataRows: pptxgen.TableRow[] = parsedLegs.map((leg, index) => {
    const zebraFill = index % 2 === 0 ? SNOW_COLORS.card : SNOW_COLORS.white;
    return [
      { text: leg!.flight, options: { fill: { color: zebraFill }, border: cellBorder, align: "right", bold: true, fontFace: FONT_SANS, fontSize: 12 } },
      { text: leg!.departure, options: { fill: { color: zebraFill }, border: cellBorder, fontFace: FONT_SANS, fontSize: 12 } },
      { text: leg!.arrival, options: { fill: { color: zebraFill }, border: cellBorder, fontFace: FONT_SANS, fontSize: 12 } },
      { text: leg!.origin, options: { fill: { color: zebraFill }, border: cellBorder, fontFace: FONT_SANS, fontSize: 12 } },
      { text: leg!.destination, options: { fill: { color: zebraFill }, border: cellBorder, fontFace: FONT_SANS, fontSize: 12 } },
    ];
  });

  return [headerRow, ...dataRows];
}

function renderBottomCard(
  slide: pptxgen.Slide,
  x: number,
  w: number,
  y: number,
  label: string,
  value: string,
  theme: PptxTheme,
): void {
  const h = 1.667;
  slide.addShape("roundRect", {
    x,
    y,
    w,
    h,
    rectRadius: 0.06,
    fill: { color: theme.primary },
    line: { type: "none" },
  });
  slide.addShape("rect", {
    x,
    y: y + 0.15,
    w: 0.042,
    h: h - 0.3,
    fill: { color: theme.onPrimary },
    line: { type: "none" },
  });
  slide.addText(label, {
    x: x + 0.2,
    y: y + 0.2,
    w: w - 0.35,
    h: 0.3,
    fontFace: FONT_SANS,
    fontSize: 9,
    bold: true,
    charSpacing: 1.8,
    color: theme.onPrimary,
  });
  slide.addText(value, {
    x: x + 0.2,
    y: y + 0.55,
    w: w - 0.35,
    h: h - 0.75,
    fontFace: FONT_SERIF,
    fontSize: 16,
    bold: true,
    color: theme.onPrimary,
    lineSpacingMultiple: 1.05,
  });
}

function renderTable(slide: pptxgen.Slide, rows: pptxgen.TableRow[], isSingleColumn: boolean): void {
  slide.addTable(rows, {
    x: CONTENT_MARGIN_X,
    y: TABLE_Y,
    w: isSingleColumn ? COLUMN_WIDTHS.reduce((a, b) => a + b, 0) : undefined,
    colW: isSingleColumn ? undefined : COLUMN_WIDTHS,
    rowH: ROW_H,
  });
}

function renderCards(slide: pptxgen.Slide, data: Pick<FlightsSlideData, "baggage" | "seat" | "services" | "theme">): void {
  const cardW = 3.98;
  const gap = 0.333;
  renderBottomCard(slide, CONTENT_MARGIN_X, cardW, CARDS_Y, "FRANQUIA DE BAGAGEM", data.baggage, data.theme);
  renderBottomCard(slide, CONTENT_MARGIN_X + cardW + gap, cardW, CARDS_Y, "MARCAÇÃO DE ASSENTO", data.seat, data.theme);
  renderBottomCard(
    slide,
    CONTENT_MARGIN_X + (cardW + gap) * 2,
    cardW,
    CARDS_Y,
    "OUTROS SERVIÇOS",
    data.services || "Nenhum informado.",
    data.theme,
  );
}

/**
 * Voos: tabela nativa (Voo/Saída/Chegada/Origem/Destino) parseada de
 * `form.flights.legs` (texto livre); se o texto não casar com o padrão
 * esperado, cai para uma tabela de 1 coluna com as linhas cruas — nunca
 * quebra a geração por formatação inesperada. 3 cards inferiores com
 * bagagem/assento/serviços, com "Nenhum informado." como fallback.
 *
 * Com muitos trechos, a tabela sobrepunha os cards inferiores (bug
 * relatado); agora pagina em slides de continuação (só tabela) e deixa os
 * cards apenas no último slide, onde cabem sem sobreposição.
 */
export function buildFlightsSlide(pres: pptxgen, data: FlightsSlideData): void {
  const legs = data.legs
    .split(/\r?\n/)
    .map((leg) => leg.trim())
    .filter(Boolean);

  const rows = buildTableRows(legs, data.theme);
  const isSingleColumn = rows[0]!.length === 1;
  const headerRow = rows[0]!;
  const dataRows = rows.slice(1);

  if (dataRows.length <= MAX_LEGS_WITH_CARDS) {
    const slide = pres.addSlide();
    renderInternalHeader(slide, data.agencyLogo, TITLE, data.theme);
    renderTable(slide, rows, isSingleColumn);
    renderCards(slide, data);
    return;
  }

  // Reserva a última página para caber com os cards: todas as páginas
  // anteriores usam a capacidade cheia do slide (sem cards).
  const legsForLastPage = ((dataRows.length - 1) % MAX_LEGS_WITH_CARDS) + 1;
  const fullPagesLegCount = dataRows.length - legsForLastPage;

  const pages: pptxgen.TableRow[][] = [];
  for (let i = 0; i < fullPagesLegCount; i += MAX_LEGS_FULL_PAGE) {
    pages.push(dataRows.slice(i, i + MAX_LEGS_FULL_PAGE));
  }
  pages.push(dataRows.slice(fullPagesLegCount));

  pages.forEach((page, index) => {
    const isLastPage = index === pages.length - 1;
    const slide = pres.addSlide();
    renderInternalHeader(slide, data.agencyLogo, index === 0 ? TITLE : `${TITLE} (continuação)`, data.theme);
    renderTable(slide, [headerRow, ...page], isSingleColumn);
    if (isLastPage) {
      renderCards(slide, data);
    }
  });
}
