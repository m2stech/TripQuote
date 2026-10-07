import type pptxgen from "pptxgenjs";

import { parseFlightLeg } from "@/features/pptx/parse-flight-leg";
import { renderInternalHeader } from "@/features/pptx/slides/internal-header";
import { CONTENT_MARGIN_X, FONT_SANS, FONT_SERIF, SNOW_COLORS } from "@/features/pptx/tokens";
import type { ResolvedImage } from "@/features/pptx/types";

export interface FlightsSlideData {
  legs: string;
  baggage: string;
  seat: string;
  services: string;
  agencyLogo: ResolvedImage;
}

const TITLE = "Voos contemplados no orçamento";
const TABLE_Y = 1.639;
const COLUMN_WIDTHS = [1.25, 2.083, 2.083, 3.431, 3.431];

function buildTableRows(legs: string[]): pptxgen.TableRow[] {
  const parsedLegs = legs.map((leg, index) => parseFlightLeg(leg, index));
  const allParsed = parsedLegs.every((leg) => leg !== null);

  const headerFill = { color: SNOW_COLORS.navy };
  const headerText = { color: SNOW_COLORS.white, bold: true, fontFace: FONT_SANS, fontSize: 11 };
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
): void {
  const h = 1.667;
  slide.addShape("roundRect", {
    x,
    y,
    w,
    h,
    rectRadius: 0.06,
    fill: { color: SNOW_COLORS.navy },
    line: { type: "none" },
  });
  slide.addShape("rect", {
    x,
    y: y + 0.15,
    w: 0.042,
    h: h - 0.3,
    fill: { color: SNOW_COLORS.hairline },
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
    color: SNOW_COLORS.hairline,
  });
  slide.addText(value, {
    x: x + 0.2,
    y: y + 0.55,
    w: w - 0.35,
    h: h - 0.75,
    fontFace: FONT_SERIF,
    fontSize: 16,
    bold: true,
    color: SNOW_COLORS.white,
    lineSpacingMultiple: 1.05,
  });
}

/**
 * Voos: tabela nativa (Voo/Saída/Chegada/Origem/Destino) parseada de
 * `form.flights.legs` (texto livre); se o texto não casar com o padrão
 * esperado, cai para uma tabela de 1 coluna com as linhas cruas — nunca
 * quebra a geração por formatação inesperada. 3 cards inferiores com
 * bagagem/assento/serviços, com "Nenhum informado." como fallback.
 */
export function buildFlightsSlide(pres: pptxgen, data: FlightsSlideData): void {
  const slide = pres.addSlide();
  renderInternalHeader(slide, data.agencyLogo, TITLE);

  const legs = data.legs
    .split(/\r?\n/)
    .map((leg) => leg.trim())
    .filter(Boolean);

  const rows = buildTableRows(legs);
  const isSingleColumn = rows[0]!.length === 1;

  slide.addTable(rows, {
    x: CONTENT_MARGIN_X,
    y: TABLE_Y,
    w: isSingleColumn ? COLUMN_WIDTHS.reduce((a, b) => a + b, 0) : undefined,
    colW: isSingleColumn ? undefined : COLUMN_WIDTHS,
    rowH: 0.583,
  });

  const cardsY = 4.861;
  const cardW = 3.98;
  const gap = 0.333;
  renderBottomCard(slide, CONTENT_MARGIN_X, cardW, cardsY, "FRANQUIA DE BAGAGEM", data.baggage);
  renderBottomCard(slide, CONTENT_MARGIN_X + cardW + gap, cardW, cardsY, "MARCAÇÃO DE ASSENTO", data.seat);
  renderBottomCard(
    slide,
    CONTENT_MARGIN_X + (cardW + gap) * 2,
    cardW,
    cardsY,
    "OUTROS SERVIÇOS",
    data.services || "Nenhum informado.",
  );
}
