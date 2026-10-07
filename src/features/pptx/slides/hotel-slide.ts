import type pptxgen from "pptxgenjs";

import { parseRoom } from "@/features/pptx/parse-room";
import { renderInternalHeader } from "@/features/pptx/slides/internal-header";
import { CONTENT_MARGIN_X, FONT_SANS, FONT_SERIF, HOTEL_PHOTO_BOX, SLIDE_WIDTH_IN, SNOW_COLORS } from "@/features/pptx/tokens";
import type { ResolvedImage } from "@/features/pptx/types";
import type { RoomOption } from "@/features/quotes/schemas/quote-form.schema";

export interface HotelSlideData {
  optionNumber: number;
  name: string;
  mealPlan: string;
  rooms: RoomOption[];
  shortDescription: string | null;
  location: string | null;
  category: string | null;
  tripadvisorRating: string | null;
  priceContext: string;
  photo: ResolvedImage;
  photoSourceUrl: string | null;
  agencyLogo: ResolvedImage;
}

const TITLE = "Escolha o hotel que melhor encaixa no seu perfil!";
const PHOTO_X = CONTENT_MARGIN_X;
const PHOTO_Y = 1.611;
const RIGHT_COL_X = 5.867;
const RIGHT_COL_W = SLIDE_WIDTH_IN - RIGHT_COL_X - CONTENT_MARGIN_X;
const MAX_ROOMS_PER_SLIDE = 6;

/** Larguras desiguais extraídas de `Orcamento_modelo.pptx` (proporções preservadas). */
const INFO_CARD_WIDTHS = [4.24, 2.356, 2.826, 2.356];

function toDataUri(buffer: Buffer): string {
  return `data:image/png;base64,${buffer.toString("base64")}`;
}

function renderPhoto(slide: pptxgen.Slide, photo: ResolvedImage, sourceUrl: string | null): void {
  if (photo.kind === "image") {
    slide.addImage({
      data: toDataUri(photo.data),
      x: PHOTO_X,
      y: PHOTO_Y,
      w: photo.sizing.w,
      h: photo.sizing.h,
      sizing: { type: "contain", w: HOTEL_PHOTO_BOX.w, h: HOTEL_PHOTO_BOX.h },
    });
    if (sourceUrl) {
      slide.addText("Foto: fonte pública verificada", {
        x: PHOTO_X,
        y: PHOTO_Y + HOTEL_PHOTO_BOX.h + 0.05,
        w: HOTEL_PHOTO_BOX.w,
        h: 0.2,
        fontFace: FONT_SANS,
        fontSize: 7,
        italic: true,
        color: SNOW_COLORS.caption,
      });
    }
  } else {
    slide.addShape("roundRect", {
      x: PHOTO_X,
      y: PHOTO_Y,
      w: HOTEL_PHOTO_BOX.w,
      h: HOTEL_PHOTO_BOX.h,
      rectRadius: 0.05,
      fill: { color: SNOW_COLORS.card },
      line: { color: SNOW_COLORS.hairline, width: 0.75 },
    });
    slide.addText("Foto ilustrativa", {
      x: PHOTO_X,
      y: PHOTO_Y,
      w: HOTEL_PHOTO_BOX.w,
      h: HOTEL_PHOTO_BOX.h,
      fontFace: FONT_SANS,
      fontSize: 11,
      color: SNOW_COLORS.caption,
      align: "center",
      valign: "middle",
    });
  }
}

function renderRoomCards(slide: pptxgen.Slide, rooms: RoomOption[], priceContext: string, y: number, h: number): void {
  const gap = 0.139;
  const cardW = (RIGHT_COL_W - gap * (rooms.length - 1)) / rooms.length;

  rooms.forEach((room, index) => {
    const parsed = parseRoom(room);
    const x = RIGHT_COL_X + index * (cardW + gap);

    slide.addShape("roundRect", {
      x,
      y,
      w: cardW,
      h,
      rectRadius: 0.06,
      fill: { color: SNOW_COLORS.card },
      line: { color: SNOW_COLORS.hairline, width: 0.75 },
    });
    slide.addText("ACOMODAÇÃO", {
      x: x + 0.15,
      y: y + 0.12,
      w: cardW - 0.3,
      h: 0.15,
      fontFace: FONT_SANS,
      fontSize: 8,
      bold: true,
      charSpacing: 1.8,
      color: SNOW_COLORS.label,
    });
    slide.addText(parsed.roomType, {
      x: x + 0.15,
      y: y + 0.32,
      w: cardW - 0.3,
      h: 0.25,
      fontFace: FONT_SANS,
      fontSize: 13,
      bold: true,
      color: SNOW_COLORS.navy,
    });
    slide.addText(parsed.price || "Consulte valores", {
      x: x + 0.15,
      y: y + 0.58,
      w: cardW - 0.3,
      h: 0.4,
      fontFace: FONT_SERIF,
      fontSize: 21,
      bold: true,
      color: SNOW_COLORS.navy,
    });
    slide.addText(priceContext, {
      x: x + 0.15,
      y: y + h - 0.35,
      w: cardW - 0.3,
      h: 0.3,
      fontFace: FONT_SANS,
      fontSize: 9.5,
      color: SNOW_COLORS.body,
    });
  });
}

function renderInfoCards(
  slide: pptxgen.Slide,
  info: { location: string; category: string; mealPlan: string; tripadvisor: string },
  y: number,
): void {
  const labels = ["LOCALIZAÇÃO", "CATEGORIA", "PLANO ALIMENTAR", "TRIPADVISOR"];
  const values = [info.location, info.category, info.mealPlan, info.tripadvisor];
  const gap = 0.1;
  const h = 1.139;

  let x = CONTENT_MARGIN_X;
  INFO_CARD_WIDTHS.forEach((w, index) => {
    slide.addShape("roundRect", {
      x,
      y,
      w,
      h,
      rectRadius: 0.08,
      fill: { color: SNOW_COLORS.card },
      line: { type: "none" },
    });
    slide.addShape("rect", {
      x,
      y,
      w: 0.042,
      h,
      fill: { color: SNOW_COLORS.navy },
      line: { type: "none" },
    });
    slide.addText(labels[index]!, {
      x: x + 0.18,
      y: y + 0.15,
      w: w - 0.33,
      h: 0.167,
      fontFace: FONT_SANS,
      fontSize: 8,
      bold: true,
      charSpacing: 1.8,
      color: SNOW_COLORS.label,
    });
    slide.addText(values[index]!, {
      x: x + 0.18,
      y: y + 0.4,
      w: w - 0.33,
      h: h - 0.55,
      fontFace: FONT_SANS,
      fontSize: 10.5,
      color: SNOW_COLORS.navy,
      lineSpacingMultiple: 1.05,
    });
    x += w + gap;
  });
}

/**
 * 1 slide por hotel (confirmado em `Orcamento_modelo.pptx`): foto + badge
 * "OPÇÃO N" + nome + descrição + mini-cards de acomodação (dinâmicos por
 * quantidade de rooms) + 4 cards de info com larguras desiguais
 * (localização/categoria/plano alimentar/tripadvisor). Hotéis com muitas
 * acomodações geram slide(s) de continuação via `buildHotelSlides`.
 */
export function buildHotelSlide(pres: pptxgen, data: HotelSlideData, isContinuation = false): void {
  const slide = pres.addSlide();
  renderInternalHeader(slide, data.agencyLogo, TITLE);

  renderPhoto(slide, isContinuation ? { kind: "placeholder" } : data.photo, data.photoSourceUrl);

  slide.addShape("roundRect", {
    x: RIGHT_COL_X,
    y: PHOTO_Y,
    w: 0.917,
    h: 0.25,
    rectRadius: 0.5,
    fill: { color: SNOW_COLORS.navy },
    line: { type: "none" },
  });
  slide.addText(`OPÇÃO ${data.optionNumber}`, {
    x: RIGHT_COL_X,
    y: PHOTO_Y,
    w: 0.917,
    h: 0.25,
    fontFace: FONT_SANS,
    fontSize: 8.5,
    bold: true,
    charSpacing: 1.5,
    color: SNOW_COLORS.white,
    align: "center",
    valign: "middle",
  });

  const nameText = isContinuation ? `${data.name} (continuação)` : data.name;
  slide.addText(nameText, {
    x: RIGHT_COL_X,
    y: PHOTO_Y + 0.306,
    w: RIGHT_COL_W,
    h: 0.6,
    fontFace: FONT_SERIF,
    fontSize: 26,
    bold: true,
    color: SNOW_COLORS.navy,
  });

  if (!isContinuation && data.shortDescription) {
    slide.addText(data.shortDescription, {
      x: RIGHT_COL_X,
      y: PHOTO_Y + 1.067,
      w: RIGHT_COL_W,
      h: 1.167,
      fontFace: FONT_SANS,
      fontSize: 11.5,
      color: SNOW_COLORS.body,
      lineSpacingMultiple: 1.08,
    });
  }

  const roomsY = PHOTO_Y + 2.311;
  const roomsH = 1.639;
  if (data.rooms.length > 0) {
    renderRoomCards(slide, data.rooms, data.priceContext, roomsY, roomsH);
  }

  if (!isContinuation) {
    renderInfoCards(
      slide,
      {
        location: data.location ?? "Não informada",
        category: data.category ?? "Não informada",
        mealPlan: data.mealPlan,
        tripadvisor: data.tripadvisorRating ?? "Avaliação não verificada",
      },
      6.083,
    );
  }
}

/**
 * Divide os `rooms` de um hotel em páginas de até `MAX_ROOMS_PER_SLIDE`,
 * gerando slides de continuação quando necessário — nunca omitir
 * acomodações por falta de espaço.
 */
export function buildHotelSlides(pres: pptxgen, data: HotelSlideData): void {
  if (data.rooms.length <= MAX_ROOMS_PER_SLIDE) {
    buildHotelSlide(pres, data);
    return;
  }

  const pages: RoomOption[][] = [];
  for (let i = 0; i < data.rooms.length; i += MAX_ROOMS_PER_SLIDE) {
    pages.push(data.rooms.slice(i, i + MAX_ROOMS_PER_SLIDE));
  }

  pages.forEach((rooms, index) => {
    buildHotelSlide(pres, { ...data, rooms }, index > 0);
  });
}
