import type pptxgen from "pptxgenjs";

import { renderInternalHeader } from "@/features/pptx/slides/internal-header";
import type { PptxTheme } from "@/features/pptx/theme/extract-theme";
import { CONTENT_MARGIN_X, FONT_SANS, FONT_SERIF, SLIDE_WIDTH_IN, SNOW_COLORS } from "@/features/pptx/tokens";
import type { ResolvedImage } from "@/features/pptx/types";

export interface PortPhotoEntry {
  name: string;
  shortDescription: string;
  photo: ResolvedImage;
}

export interface PortPhotosSlideData {
  ports: PortPhotoEntry[];
  agencyLogo: ResolvedImage;
  theme: PptxTheme;
}

const TITLE = "Portos de escala";
const MAX_PORTS_PER_SLIDE = 3;
const CARDS_Y = 1.75;
const CARD_PHOTO_H = 2.8;
const GAP = 0.222;

function toDataUri(buffer: Buffer): string {
  return `data:image/png;base64,${buffer.toString("base64")}`;
}

function renderPortCard(slide: pptxgen.Slide, port: PortPhotoEntry, x: number, w: number): void {
  if (port.photo.kind === "image") {
    slide.addImage({
      data: toDataUri(port.photo.data),
      x,
      y: CARDS_Y,
      w,
      h: CARD_PHOTO_H,
      sizing: { type: "cover", w, h: CARD_PHOTO_H },
    });
  } else {
    slide.addShape("roundRect", {
      x,
      y: CARDS_Y,
      w,
      h: CARD_PHOTO_H,
      rectRadius: 0.06,
      fill: { color: SNOW_COLORS.card },
      line: { color: SNOW_COLORS.hairline, width: 0.75 },
    });
    slide.addText("Foto ilustrativa", {
      x,
      y: CARDS_Y,
      w,
      h: CARD_PHOTO_H,
      fontFace: FONT_SANS,
      fontSize: 10,
      color: SNOW_COLORS.caption,
      align: "center",
      valign: "middle",
    });
  }

  slide.addText(port.name, {
    x,
    y: CARDS_Y + CARD_PHOTO_H + 0.14,
    w,
    h: 0.35,
    fontFace: FONT_SERIF,
    fontSize: 15,
    bold: true,
    color: SNOW_COLORS.navy,
  });
  slide.addText(port.shortDescription, {
    x,
    y: CARDS_Y + CARD_PHOTO_H + 0.5,
    w,
    h: 0.7,
    fontFace: FONT_SANS,
    fontSize: 10,
    color: SNOW_COLORS.body,
    lineSpacingMultiple: 1.1,
    valign: "top",
  });
}

function buildPortPhotosSlidePage(pres: pptxgen, data: PortPhotosSlideData, ports: PortPhotoEntry[], isContinuation: boolean): void {
  const slide = pres.addSlide();
  renderInternalHeader(slide, data.agencyLogo, isContinuation ? `${TITLE} (continuação)` : TITLE, data.theme);

  const totalW = SLIDE_WIDTH_IN - CONTENT_MARGIN_X * 2;
  const cardW = (totalW - GAP * (ports.length - 1)) / Math.max(ports.length, 1);

  ports.forEach((port, index) => {
    const x = CONTENT_MARGIN_X + index * (cardW + GAP);
    renderPortCard(slide, port, x, cardW);
  });
}

/**
 * Galeria de portos de escala do roteiro (foto + nome + breve descrição),
 * até 3 por slide, paginando em slides de continuação. Vem logo após a
 * tabela de roteiro (`cruise-itinerary-slide.ts`) — que é só texto/dados,
 * sem imagem. Omitido quando não há nenhum porto com dados da IA
 * disponíveis (roteiro não informado ou só dias de navegação).
 */
export function buildPortPhotosSlide(pres: pptxgen, data: PortPhotosSlideData): void {
  if (data.ports.length === 0) return;

  for (let start = 0; start < data.ports.length; start += MAX_PORTS_PER_SLIDE) {
    const page = data.ports.slice(start, start + MAX_PORTS_PER_SLIDE);
    buildPortPhotosSlidePage(pres, data, page, start > 0);
  }
}
