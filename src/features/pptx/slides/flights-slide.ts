import type pptxgen from "pptxgenjs";

import { renderInternalHeader } from "@/features/pptx/slides/internal-header";
import type { PptxTheme } from "@/features/pptx/theme/extract-theme";
import { CONTENT_MARGIN_X, FONT_SANS, FONT_SERIF, SLIDE_HEIGHT_IN, SLIDE_WIDTH_IN, SNOW_COLORS } from "@/features/pptx/tokens";
import type { ResolvedImage } from "@/features/pptx/types";
import type { FlightDirection, StructuredFlightLeg } from "@/features/quotes/schemas/generation-output.schema";

export interface FlightsSlideData {
  legs: StructuredFlightLeg[];
  /** Linhas cruas do texto digitado — fallback quando a IA não estruturou nenhum trecho. */
  rawLines: string[];
  baggage: string;
  seat: string;
  services: string;
  agencyLogo: ResolvedImage;
  theme: PptxTheme;
}

const TITLE_BY_DIRECTION: Record<FlightDirection, string> = {
  outbound: "Ida",
  return: "Retorno",
};

const LEGS_Y = 1.5;
const CARD_GAP = 0.139;
const MAX_CARD_H = 1.25;
/** Abaixo desta altura, o card de trecho não cabe mais no layout de 2 linhas (rota+cidade / companhia+voo / horários+duração) sem sobrepor texto — cai no layout compacto de 1 linha única. */
const MIN_DETAILED_CARD_H = 0.85;
const BOTTOM_CARDS_H = 1.25;
const BOTTOM_MARGIN = 0.3;
/** Altura reservada ao label "IDA"/"RETORNO" que antecede cada grupo de trechos. */
const GROUP_LABEL_H = 0.306;
/** Todos os trechos (ida + volta) + os 3 cards de bagagem/assento/serviços sempre numa única página — nunca paginar nem sobrepor, mesmo com várias conexões. */
const BOTTOM_CARDS_Y = SLIDE_HEIGHT_IN - BOTTOM_MARGIN - BOTTOM_CARDS_H;
const LEGS_AVAILABLE_HEIGHT = BOTTOM_CARDS_Y - CARD_GAP - LEGS_Y;

/** Altura de card que cabe no espaço disponível, descontando os labels de grupo (1 por direção presente) e os espaçamentos entre todos os cards. */
function computeCardHeight(legCount: number, groupCount: number): number {
  const totalGroupLabelsH = groupCount * GROUP_LABEL_H;
  const totalGap = CARD_GAP * (legCount - 1 + groupCount);
  const rawHeight = (LEGS_AVAILABLE_HEIGHT - totalGroupLabelsH - totalGap) / legCount;
  return Math.min(rawHeight, MAX_CARD_H);
}

/** Posição Y do topo do bloco de trechos: centraliza verticalmente quando não preenche toda a altura disponível (poucos trechos). */
function computeLegsStartY(legCount: number, groupCount: number, cardH: number): number {
  const totalHeight = legCount * cardH + (legCount - 1 + groupCount) * CARD_GAP + groupCount * GROUP_LABEL_H;
  const slack = LEGS_AVAILABLE_HEIGHT - totalHeight;
  return LEGS_Y + Math.max(slack, 0) / 2;
}

function renderGroupLabel(slide: pptxgen.Slide, text: string, y: number, theme: PptxTheme): void {
  slide.addText(text.toUpperCase(), {
    x: CONTENT_MARGIN_X,
    y,
    w: SLIDE_WIDTH_IN - CONTENT_MARGIN_X * 2,
    h: GROUP_LABEL_H,
    fontFace: FONT_SANS,
    fontSize: 11,
    bold: true,
    charSpacing: 1.8,
    color: theme.primary,
    valign: "middle",
  });
}

function renderDetailedLegCard(
  slide: pptxgen.Slide,
  leg: StructuredFlightLeg,
  index: number,
  y: number,
  h: number,
  theme: PptxTheme,
): void {
  const w = SLIDE_WIDTH_IN - CONTENT_MARGIN_X * 2;
  const pad = Math.min(0.2, h * 0.16);
  const lineH = (h - pad * 2) / 2;

  slide.addShape("roundRect", {
    x: CONTENT_MARGIN_X,
    y,
    w,
    h,
    rectRadius: 0.06,
    fill: { color: SNOW_COLORS.card },
    line: { color: SNOW_COLORS.hairline, width: 0.75 },
  });

  const badgeH = Math.min(0.3, lineH);
  slide.addShape("roundRect", {
    x: CONTENT_MARGIN_X + 0.2,
    y: y + pad,
    w: 1.1,
    h: badgeH,
    rectRadius: 0.5,
    fill: { color: theme.primary },
    line: { type: "none" },
  });
  slide.addText(`TRECHO ${index + 1}`, {
    x: CONTENT_MARGIN_X + 0.2,
    y: y + pad,
    w: 1.1,
    h: badgeH,
    fontFace: FONT_SANS,
    fontSize: 8.5,
    bold: true,
    charSpacing: 1.2,
    color: theme.onPrimary,
    align: "center",
    valign: "middle",
  });

  slide.addText(`${leg.originCode}  →  ${leg.destinationCode}`, {
    x: CONTENT_MARGIN_X + 1.5,
    y: y + pad * 0.3,
    w: 2.8,
    h: lineH,
    fontFace: FONT_SERIF,
    fontSize: 17,
    bold: true,
    color: SNOW_COLORS.navy,
    valign: "middle",
  });
  slide.addText(`${leg.originCity}  →  ${leg.destinationCity}`, {
    x: CONTENT_MARGIN_X + 1.5,
    y: y + pad + lineH,
    w: 2.8,
    h: lineH,
    fontFace: FONT_SANS,
    fontSize: 9.5,
    color: SNOW_COLORS.caption,
    valign: "top",
  });

  slide.addText(leg.airline, {
    x: CONTENT_MARGIN_X + 4.5,
    y: y + pad * 0.3,
    w: 2.5,
    h: lineH,
    fontFace: FONT_SANS,
    fontSize: 11.5,
    bold: true,
    color: SNOW_COLORS.body,
    valign: "middle",
  });
  slide.addText(leg.flightNumber, {
    x: CONTENT_MARGIN_X + 4.5,
    y: y + pad + lineH,
    w: 2.5,
    h: lineH,
    fontFace: FONT_SANS,
    fontSize: 10,
    color: SNOW_COLORS.caption,
    valign: "top",
  });

  slide.addText(`${leg.departureTime}  •  ${leg.arrivalTime}`, {
    x: CONTENT_MARGIN_X + 7.2,
    y: y + pad * 0.3,
    w: 2.9,
    h: lineH,
    fontFace: FONT_SANS,
    fontSize: 11.5,
    bold: true,
    color: SNOW_COLORS.body,
    valign: "middle",
  });
  slide.addText(`Duração  ${leg.duration}`, {
    x: CONTENT_MARGIN_X + 7.2,
    y: y + pad + lineH,
    w: 2.9,
    h: lineH,
    fontFace: FONT_SANS,
    fontSize: 10,
    color: SNOW_COLORS.caption,
    valign: "top",
  });
}

/** Layout compacto (1 linha) usado quando há trechos demais para o card de 2 linhas caber sem sobrepor texto (ex.: itinerários com várias conexões). */
function renderCompactLegCard(
  slide: pptxgen.Slide,
  leg: StructuredFlightLeg,
  index: number,
  y: number,
  h: number,
  theme: PptxTheme,
): void {
  const w = SLIDE_WIDTH_IN - CONTENT_MARGIN_X * 2;
  const fontSize = h < 0.42 ? 8.5 : 9.5;

  slide.addShape("roundRect", {
    x: CONTENT_MARGIN_X,
    y,
    w,
    h,
    rectRadius: 0.05,
    fill: { color: SNOW_COLORS.card },
    line: { color: SNOW_COLORS.hairline, width: 0.75 },
  });

  const badgeW = 0.95;
  slide.addShape("roundRect", {
    x: CONTENT_MARGIN_X + 0.14,
    y: y + h * 0.18,
    w: badgeW,
    h: h * 0.64,
    rectRadius: 0.5,
    fill: { color: theme.primary },
    line: { type: "none" },
  });
  slide.addText(`${index + 1}`, {
    x: CONTENT_MARGIN_X + 0.14,
    y: y + h * 0.18,
    w: badgeW,
    h: h * 0.64,
    fontFace: FONT_SANS,
    fontSize,
    bold: true,
    color: theme.onPrimary,
    align: "center",
    valign: "middle",
  });

  const text =
    `${leg.originCode} → ${leg.destinationCode}   ` +
    `${leg.airline} ${leg.flightNumber}   ` +
    `${leg.departureTime} • ${leg.arrivalTime}   ` +
    `Duração ${leg.duration}`;
  slide.addText(text, {
    x: CONTENT_MARGIN_X + 0.14 + badgeW + 0.16,
    y,
    w: w - 0.14 - badgeW - 0.16 - 0.14,
    h,
    fontFace: FONT_SANS,
    fontSize,
    color: SNOW_COLORS.body,
    valign: "middle",
  });
}

function renderRawLegsTable(slide: pptxgen.Slide, lines: string[]): void {
  const rows: pptxgen.TableRow[] = [
    [{ text: "Trecho", options: { fill: { color: SNOW_COLORS.navy }, color: SNOW_COLORS.white, bold: true, fontFace: FONT_SANS, fontSize: 11 } }],
    ...lines.map((line): pptxgen.TableRow => [
      { text: line, options: { border: { type: "solid", color: SNOW_COLORS.hairline, pt: 0.5 }, fontFace: FONT_SANS, fontSize: 12 } },
    ]),
  ];
  slide.addTable(rows, {
    x: CONTENT_MARGIN_X,
    y: LEGS_Y,
    w: SLIDE_WIDTH_IN - CONTENT_MARGIN_X * 2,
    rowH: 0.583,
  });
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
  const h = BOTTOM_CARDS_H;
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
    y: y + 0.17,
    w: w - 0.35,
    h: 0.28,
    fontFace: FONT_SANS,
    fontSize: 9,
    bold: true,
    charSpacing: 1.8,
    color: theme.onPrimary,
  });
  slide.addText(value, {
    x: x + 0.2,
    y: y + 0.48,
    w: w - 0.35,
    h: h - 0.65,
    fontFace: FONT_SERIF,
    fontSize: 15,
    bold: true,
    color: theme.onPrimary,
    lineSpacingMultiple: 1.05,
  });
}

function renderBottomCards(slide: pptxgen.Slide, data: Pick<FlightsSlideData, "baggage" | "seat" | "services" | "theme">): void {
  const cardW = 3.98;
  const gap = 0.333;
  renderBottomCard(slide, CONTENT_MARGIN_X, cardW, BOTTOM_CARDS_Y, "FRANQUIA DE BAGAGEM", data.baggage, data.theme);
  renderBottomCard(slide, CONTENT_MARGIN_X + cardW + gap, cardW, BOTTOM_CARDS_Y, "MARCAÇÃO DE ASSENTO", data.seat, data.theme);
  renderBottomCard(
    slide,
    CONTENT_MARGIN_X + (cardW + gap) * 2,
    cardW,
    BOTTOM_CARDS_Y,
    "OUTROS SERVIÇOS",
    data.services || "Nenhum informado.",
    data.theme,
  );
}

/**
 * Renderiza todos os grupos (ida / retorno) no mesmo slide, um label
 * "IDA"/"RETORNO" antes de cada grupo quando há mais de um — card único
 * (sem label) quando só uma direção está presente.
 */
function renderLegsGroups(
  slide: pptxgen.Slide,
  groups: Array<{ direction: FlightDirection; legs: StructuredFlightLeg[] }>,
  theme: PptxTheme,
): void {
  const totalLegs = groups.reduce((sum, group) => sum + group.legs.length, 0);
  const showLabels = groups.length > 1;
  const cardH = computeCardHeight(totalLegs, showLabels ? groups.length : 0);
  const renderCard = cardH >= MIN_DETAILED_CARD_H ? renderDetailedLegCard : renderCompactLegCard;

  let y = computeLegsStartY(totalLegs, showLabels ? groups.length : 0, cardH);
  let legIndex = 0;

  for (const group of groups) {
    if (showLabels) {
      renderGroupLabel(slide, TITLE_BY_DIRECTION[group.direction], y, theme);
      y += GROUP_LABEL_H + CARD_GAP;
    }
    group.legs.forEach((leg) => {
      renderCard(slide, leg, legIndex, y, cardH, theme);
      y += cardH + CARD_GAP;
      legIndex += 1;
    });
  }
}

/**
 * Voos: ida e retorno no mesmo slide (pedido do cliente — antes cada
 * direção tinha seu próprio slide, o que duplicava os cards de bagagem/
 * assento/serviços e fragmentava a informação desnecessariamente), cada
 * trecho num card com companhia aérea, nº do voo, aeroportos com nome da
 * cidade, horários e duração — substitui a tabela genérica anterior (Voo/
 * Saída/Chegada/Origem/Destino), apontada pelo usuário como visualmente
 * pobre comparada ao fluxo legado (`Prompt_orcamento_SNOW.html`). Os
 * trechos vêm sempre estruturados pela IA (`flightItinerary`, a partir do
 * texto digitado e/ou da imagem de comprovante); sem nenhum trecho
 * estruturado, cai numa tabela com as linhas cruas digitadas, para nunca
 * perder a informação por falha da IA.
 *
 * Todos os trechos (ida + volta) + os cards de bagagem/assento/serviços
 * cabem sempre numa única página (nunca pagina, nunca duplica o último
 * trecho): a altura do card de trecho é calculada dinamicamente a partir da
 * quantidade total de trechos e de grupos (`computeCardHeight`), com um
 * layout compacto de 1 linha para itinerários com muitas conexões, onde o
 * card de 2 linhas não caberia sem sobrepor texto.
 */
export function buildFlightsSlide(pres: pptxgen, data: FlightsSlideData): void {
  const slide = pres.addSlide();
  renderInternalHeader(slide, data.agencyLogo, "Voos contemplados no orçamento", data.theme);

  if (data.legs.length === 0) {
    renderRawLegsTable(slide, data.rawLines);
    renderBottomCards(slide, data);
    return;
  }

  const outboundLegs = data.legs.filter((leg) => leg.direction === "outbound");
  const returnLegs = data.legs.filter((leg) => leg.direction === "return");
  const groups: Array<{ direction: FlightDirection; legs: StructuredFlightLeg[] }> = [
    ...(outboundLegs.length > 0 ? [{ direction: "outbound" as const, legs: outboundLegs }] : []),
    ...(returnLegs.length > 0 ? [{ direction: "return" as const, legs: returnLegs }] : []),
  ];

  renderLegsGroups(slide, groups, data.theme);
  renderBottomCards(slide, data);
}
