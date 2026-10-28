import type pptxgen from "pptxgenjs";

import { renderInternalHeader } from "@/features/pptx/slides/internal-header";
import type { PptxTheme } from "@/features/pptx/theme/extract-theme";
import { CONTENT_MARGIN_X, FONT_SANS, FONT_SERIF, SLIDE_WIDTH_IN, SNOW_COLORS } from "@/features/pptx/tokens";
import type { ResolvedImage } from "@/features/pptx/types";
import type { Cabin } from "@/features/quotes/schemas/cruise-form.schema";

/** Cabine do formulário com a foto já resolvida (buffer baixado do Storage, ver `resolveCabinPhoto`). */
export interface CabinWithPhoto {
  cabin: Cabin;
  photo: ResolvedImage;
}

export interface CabinsSlideData {
  cabins: CabinWithPhoto[];
  defaultOccupancy: string;
  agencyLogo: ResolvedImage;
  theme: PptxTheme;
}

const TITLE = "Cabines e tarifas";
const MAX_CABINS_PER_SLIDE = 3;
const CARDS_Y = 1.75;
const CARD_H = 4.4;
const CARD_PHOTO_H = 2.1;
const GAP = 0.222;

/**
 * Caixa de referência (polegadas) para o sizing da foto de cabine —
 * aproxima a largura real de um card de 3 colunas (ver `buildCabinsSlidePage`)
 * sem acoplar `resolveCabinPhoto` ao cálculo exato de `cardW`, que depende
 * da quantidade de cabines na página.
 */
export const CABIN_PHOTO_BOX = { w: 3.2, h: CARD_PHOTO_H };

function toDataUri(buffer: Buffer): string {
  return `data:image/png;base64,${buffer.toString("base64")}`;
}

function renderCabinPhoto(slide: pptxgen.Slide, photo: ResolvedImage, x: number, w: number): void {
  const photoX = x + 0.15;
  const photoY = CARDS_Y + 0.15;
  const photoW = w - 0.3;

  if (photo.kind === "image") {
    slide.addImage({
      data: toDataUri(photo.data),
      x: photoX,
      y: photoY,
      w: photoW,
      h: CARD_PHOTO_H,
      sizing: { type: "cover", w: photoW, h: CARD_PHOTO_H },
    });
  } else {
    slide.addShape("roundRect", {
      x: photoX,
      y: photoY,
      w: photoW,
      h: CARD_PHOTO_H,
      rectRadius: 0.06,
      fill: { color: SNOW_COLORS.white },
      line: { color: SNOW_COLORS.hairline, width: 0.75 },
    });
    slide.addText("Foto da cabine", {
      x: photoX,
      y: photoY,
      w: photoW,
      h: CARD_PHOTO_H,
      fontFace: FONT_SANS,
      fontSize: 10,
      color: SNOW_COLORS.caption,
      align: "center",
      valign: "middle",
    });
  }
}

function renderCabinCard(
  slide: pptxgen.Slide,
  entry: CabinWithPhoto,
  x: number,
  w: number,
  defaultOccupancy: string,
  theme: PptxTheme,
): void {
  const { cabin } = entry;

  slide.addShape("roundRect", {
    x,
    y: CARDS_Y,
    w,
    h: CARD_H,
    rectRadius: 0.08,
    fill: { color: SNOW_COLORS.card },
    line: { type: "none" },
  });

  renderCabinPhoto(slide, entry.photo, x, w);

  const textY = CARDS_Y + 0.15 + CARD_PHOTO_H + 0.2;
  slide.addText(cabin.category, {
    x: x + 0.2,
    y: textY,
    w: w - 0.4,
    h: 0.4,
    fontFace: FONT_SERIF,
    fontSize: 17,
    bold: true,
    color: SNOW_COLORS.navy,
  });
  slide.addText(cabin.type, {
    x: x + 0.2,
    y: textY + 0.4,
    w: w - 0.4,
    h: 0.25,
    fontFace: FONT_SANS,
    fontSize: 10.5,
    color: SNOW_COLORS.caption,
  });
  slide.addText(`Ocupação: ${cabin.occupancy || defaultOccupancy}`, {
    x: x + 0.2,
    y: textY + 0.65,
    w: w - 0.4,
    h: 0.25,
    fontFace: FONT_SANS,
    fontSize: 10.5,
    color: SNOW_COLORS.body,
  });
  slide.addText(cabin.price, {
    x: x + 0.2,
    y: textY + 0.95,
    w: w - 0.4,
    h: 0.4,
    fontFace: FONT_SERIF,
    fontSize: 19,
    bold: true,
    color: theme.textOnLight,
  });
}

function buildCabinsSlidePage(pres: pptxgen, data: CabinsSlideData, cabins: CabinWithPhoto[], isContinuation: boolean): void {
  const slide = pres.addSlide();
  renderInternalHeader(slide, data.agencyLogo, isContinuation ? `${TITLE} (continuação)` : TITLE, data.theme);

  const totalW = SLIDE_WIDTH_IN - CONTENT_MARGIN_X * 2;
  const cardW = (totalW - GAP * (cabins.length - 1)) / Math.max(cabins.length, 1);

  cabins.forEach((entry, index) => {
    const x = CONTENT_MARGIN_X + index * (cardW + GAP);
    renderCabinCard(slide, entry, x, cardW, data.defaultOccupancy, data.theme);
  });
}

/**
 * Cabines e tarifas: até 3 cards por slide (foto quando enviada no upload do
 * formulário — sem busca externa, não existe fonte pública confiável de
 * fotos por categoria de cabine — categoria, tipo, ocupação, valor em
 * destaque, transcrição exata do formulário, sem cálculo), paginando em
 * slides de continuação quando há mais cabines. Mesmo princípio do hotel
 * terrestre (nunca omitir opções por falta de espaço).
 */
export function buildCabinsSlide(pres: pptxgen, data: CabinsSlideData): void {
  if (data.cabins.length === 0) return;

  for (let start = 0; start < data.cabins.length; start += MAX_CABINS_PER_SLIDE) {
    const page = data.cabins.slice(start, start + MAX_CABINS_PER_SLIDE);
    buildCabinsSlidePage(pres, data, page, start > 0);
  }
}
