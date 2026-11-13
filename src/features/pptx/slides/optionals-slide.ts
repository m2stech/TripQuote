import type pptxgen from "pptxgenjs";

import { renderInternalHeader } from "@/features/pptx/slides/internal-header";
import type { PptxTheme } from "@/features/pptx/theme/extract-theme";
import { CONTENT_MARGIN_X, FONT_SANS, FONT_SERIF, SLIDE_WIDTH_IN, SNOW_COLORS } from "@/features/pptx/tokens";
import type { ResolvedImage } from "@/features/pptx/types";
import type { OptionalItem } from "@/features/quotes/schemas/quote-form.schema";

/** Item opcional do formulário com a foto já resolvida (ver `resolveOptionalItemPhoto`). */
export interface OptionalItemWithPhoto {
  item: OptionalItem;
  photo: ResolvedImage;
}

export interface OptionalsSlideData {
  items: OptionalItemWithPhoto[];
  agencyLogo: ResolvedImage;
  theme: PptxTheme;
}

const TITLE = "Opcionais";
const MAX_ITEMS_PER_SLIDE = 3;
const CARDS_Y = 1.75;
const CARD_H = 4.4;
const CARD_PHOTO_H = 2.1;
const GAP = 0.222;
/**
 * Acima deste nº de caracteres, a descrição é truncada com reticências —
 * card de altura fixa (mesmo padrão de `cabins-slide.ts`), sem recalcular a
 * grade dinamicamente como `itinerary-slide.ts` faz para texto full-width
 * (não se aplica a um card estreito de 3 colunas).
 */
const DESCRIPTION_MAX_CHARS = 220;

/**
 * Caixa de referência (polegadas) para o sizing da foto do item opcional —
 * aproxima a largura real de um card de 3 colunas (ver `buildOptionalsSlidePage`)
 * sem acoplar `resolveOptionalItemPhoto` ao cálculo exato de `cardW`.
 */
export const OPTIONAL_ITEM_PHOTO_BOX = { w: 3.2, h: CARD_PHOTO_H };

function toDataUri(buffer: Buffer): string {
  return `data:image/png;base64,${buffer.toString("base64")}`;
}

function truncateDescription(description: string): string {
  if (description.length <= DESCRIPTION_MAX_CHARS) return description;
  return `${description.slice(0, DESCRIPTION_MAX_CHARS - 1).trimEnd()}…`;
}

function renderItemPhoto(slide: pptxgen.Slide, photo: ResolvedImage, x: number, w: number): void {
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
    slide.addText("Imagem do opcional", {
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

function renderItemCard(
  slide: pptxgen.Slide,
  entry: OptionalItemWithPhoto,
  x: number,
  w: number,
  theme: PptxTheme,
): void {
  const { item } = entry;

  slide.addShape("roundRect", {
    x,
    y: CARDS_Y,
    w,
    h: CARD_H,
    rectRadius: 0.08,
    fill: { color: SNOW_COLORS.card },
    line: { type: "none" },
  });

  renderItemPhoto(slide, entry.photo, x, w);

  const textY = CARDS_Y + 0.15 + CARD_PHOTO_H + 0.2;
  slide.addText(item.title || "Opcional", {
    x: x + 0.2,
    y: textY,
    w: w - 0.4,
    h: 0.4,
    fontFace: FONT_SERIF,
    fontSize: 15,
    bold: true,
    color: SNOW_COLORS.navy,
  });
  if (item.description) {
    slide.addText(truncateDescription(item.description), {
      x: x + 0.2,
      y: textY + 0.4,
      w: w - 0.4,
      h: 1.1,
      fontFace: FONT_SANS,
      fontSize: 10.5,
      color: SNOW_COLORS.body,
      valign: "top",
      lineSpacingMultiple: 1.08,
    });
  }
  if (item.price) {
    slide.addText(item.price, {
      x: x + 0.2,
      y: textY + 1.55,
      w: w - 0.4,
      h: 0.4,
      fontFace: FONT_SERIF,
      fontSize: 16,
      bold: true,
      color: theme.textOnLight,
    });
  }
}

function buildOptionalsSlidePage(
  pres: pptxgen,
  data: OptionalsSlideData,
  items: OptionalItemWithPhoto[],
  isContinuation: boolean,
): void {
  const slide = pres.addSlide();
  renderInternalHeader(slide, data.agencyLogo, isContinuation ? `${TITLE} (continuação)` : TITLE, data.theme);

  const totalW = SLIDE_WIDTH_IN - CONTENT_MARGIN_X * 2;
  const cardW = (totalW - GAP * (items.length - 1)) / Math.max(items.length, 1);

  items.forEach((entry, index) => {
    const x = CONTENT_MARGIN_X + index * (cardW + GAP);
    renderItemCard(slide, entry, x, cardW, data.theme);
  });
}

/**
 * Opcionais (seção própria do formulário terrestre, controlada por
 * `optionals.enabled`): até 3 cards por slide (foto quando enviada no
 * upload — sem busca externa e sem interpretação por IA, 100% passthrough
 * form→slide, igual à "Programação dia a dia"), título, descrição truncada
 * e valor em destaque, transcrição exata do formulário. Pagina em slides de
 * continuação quando há mais itens, nunca omitindo.
 */
export function buildOptionalsSlide(pres: pptxgen, data: OptionalsSlideData): void {
  if (data.items.length === 0) return;

  for (let start = 0; start < data.items.length; start += MAX_ITEMS_PER_SLIDE) {
    const page = data.items.slice(start, start + MAX_ITEMS_PER_SLIDE);
    buildOptionalsSlidePage(pres, data, page, start > 0);
  }
}
