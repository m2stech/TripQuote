import type pptxgen from "pptxgenjs";

import { renderInternalHeader } from "@/features/pptx/slides/internal-header";
import type { PptxTheme } from "@/features/pptx/theme/extract-theme";
import { CONTENT_MARGIN_X, FONT_SANS, FONT_SERIF, SLIDE_WIDTH_IN, SNOW_COLORS } from "@/features/pptx/tokens";
import type { ResolvedImage } from "@/features/pptx/types";
import type { GeneratedShipProfile } from "@/features/quotes/schemas/generation-output.schema";

export interface ShipProfileSlideData {
  shipName: string;
  shipProfile: GeneratedShipProfile;
  shipPhoto: ResolvedImage;
  agencyLogo: ResolvedImage;
  theme: PptxTheme;
}

const TITLE = "Conheça o navio";
const PHOTO_X = CONTENT_MARGIN_X;
const PHOTO_Y = 1.611;
const PHOTO_BOX = { w: 4.903, h: 3.674 };
const RIGHT_COL_X = 5.867;
const RIGHT_COL_W = SLIDE_WIDTH_IN - RIGHT_COL_X - CONTENT_MARGIN_X;

function toDataUri(buffer: Buffer): string {
  return `data:image/png;base64,${buffer.toString("base64")}`;
}

function renderPhoto(slide: pptxgen.Slide, photo: ResolvedImage): void {
  if (photo.kind === "image") {
    slide.addImage({
      data: toDataUri(photo.data),
      x: PHOTO_X,
      y: PHOTO_Y,
      w: photo.sizing.w,
      h: photo.sizing.h,
      sizing: { type: "contain", w: PHOTO_BOX.w, h: PHOTO_BOX.h },
    });
  } else {
    slide.addShape("roundRect", {
      x: PHOTO_X,
      y: PHOTO_Y,
      w: PHOTO_BOX.w,
      h: PHOTO_BOX.h,
      rectRadius: 0.05,
      fill: { color: SNOW_COLORS.card },
      line: { color: SNOW_COLORS.hairline, width: 0.75 },
    });
    slide.addText("Imagem ilustrativa", {
      x: PHOTO_X,
      y: PHOTO_Y,
      w: PHOTO_BOX.w,
      h: PHOTO_BOX.h,
      fontFace: FONT_SANS,
      fontSize: 11,
      color: SNOW_COLORS.caption,
      align: "center",
      valign: "middle",
    });
  }
}

/**
 * Slide "Conheça o navio": foto do navio (esquerda) + classe/capacidade
 * (cards) + diferenciais em lista (direita) — dados pesquisados pela IA
 * (`shipProfile`, ver prompt seed de cruzeiro), nunca inventados.
 */
export function buildShipProfileSlide(pres: pptxgen, data: ShipProfileSlideData): void {
  const slide = pres.addSlide();
  renderInternalHeader(slide, data.agencyLogo, TITLE, data.theme);

  renderPhoto(slide, data.shipPhoto);

  slide.addText(data.shipName, {
    x: RIGHT_COL_X,
    y: PHOTO_Y,
    w: RIGHT_COL_W,
    h: 0.6,
    fontFace: FONT_SERIF,
    fontSize: 24,
    bold: true,
    color: SNOW_COLORS.navy,
  });

  const infoCards: Array<{ label: string; value: string }> = [
    { label: "CLASSE DO NAVIO", value: data.shipProfile.shipClass },
    { label: "CAPACIDADE", value: data.shipProfile.capacity },
  ];
  const cardW = (RIGHT_COL_W - 0.139) / 2;
  const cardH = 0.889;
  const cardsY = PHOTO_Y + 0.75;

  infoCards.forEach((card, index) => {
    const x = RIGHT_COL_X + index * (cardW + 0.139);
    slide.addShape("roundRect", {
      x,
      y: cardsY,
      w: cardW,
      h: cardH,
      rectRadius: 0.08,
      fill: { color: SNOW_COLORS.card },
      line: { type: "none" },
    });
    slide.addText(card.label, {
      x: x + 0.15,
      y: cardsY + 0.14,
      w: cardW - 0.3,
      h: 0.167,
      fontFace: FONT_SANS,
      fontSize: 7.5,
      bold: true,
      charSpacing: 1.5,
      color: SNOW_COLORS.label,
    });
    slide.addText(card.value, {
      x: x + 0.15,
      y: cardsY + 0.37,
      w: cardW - 0.3,
      h: cardH - 0.5,
      fontFace: FONT_SANS,
      fontSize: 12.5,
      bold: true,
      color: data.theme.textOnLight,
      valign: "top",
    });
  });

  slide.addText("DIFERENCIAIS", {
    x: RIGHT_COL_X,
    y: cardsY + cardH + 0.278,
    w: RIGHT_COL_W,
    h: 0.167,
    fontFace: FONT_SANS,
    fontSize: 8,
    bold: true,
    charSpacing: 1.8,
    color: SNOW_COLORS.label,
  });

  data.shipProfile.highlights.slice(0, 5).forEach((highlight, index) => {
    const y = cardsY + cardH + 0.5 + index * 0.361;
    slide.addShape("diamond", {
      x: RIGHT_COL_X,
      y: y + 0.06,
      w: 0.097,
      h: 0.097,
      fill: { color: data.theme.primary },
      line: { type: "none" },
    });
    slide.addText(highlight, {
      x: RIGHT_COL_X + 0.222,
      y,
      w: RIGHT_COL_W - 0.222,
      h: 0.3,
      fontFace: FONT_SANS,
      fontSize: 11.5,
      color: SNOW_COLORS.body,
      valign: "top",
    });
  });
}
