import type pptxgen from "pptxgenjs";

import { renderGradientOverlay, COVER_GRADIENT_STOPS } from "@/features/pptx/images/render-gradient-overlay";
import type { PptxTheme } from "@/features/pptx/theme/extract-theme";
import { CONTENT_MARGIN_X, COVER_LOGO_BOX, FONT_SANS, FONT_SERIF, SLIDE_HEIGHT_IN, SLIDE_WIDTH_IN } from "@/features/pptx/tokens";
import type { ResolvedImage } from "@/features/pptx/types";

const OVERLAY_DPI = 150;
const OVERLAY_Y = 2.915;

export interface CruiseCoverSlideData {
  shipName: string;
  cruiseLine: string;
  tagline: string;
  period: string;
  occupancy: string;
  currency: string;
  agencyLogo: ResolvedImage;
  shipPhoto: ResolvedImage;
  theme: PptxTheme;
}

function toDataUri(buffer: Buffer, mime = "image/png"): string {
  return `data:${mime};base64,${buffer.toString("base64")}`;
}

/**
 * Capa do orçamento de Cruzeiro — mesmo padrão visual de `buildCoverSlide`
 * (terrestre): foto full-bleed (do navio, quando confirmada) ou fundo navy
 * sólido + overlay de gradiente, logo da agência, e 4 campos sobrepostos.
 * Difere no conteúdo dos campos (embarque/desembarque e companhia em vez de
 * destino/viajantes) e no título principal (navio, não destino).
 */
export async function buildCruiseCoverSlide(pres: pptxgen, data: CruiseCoverSlideData): Promise<void> {
  const slide = pres.addSlide();

  if (data.shipPhoto.kind === "image") {
    slide.addImage({
      data: toDataUri(data.shipPhoto.data),
      x: 0,
      y: 0,
      w: SLIDE_WIDTH_IN,
      h: SLIDE_HEIGHT_IN,
      sizing: { type: "cover", w: SLIDE_WIDTH_IN, h: SLIDE_HEIGHT_IN },
    });

    const overlayHeight = SLIDE_HEIGHT_IN - OVERLAY_Y;
    const overlayBuffer = await renderGradientOverlay(
      Math.round(SLIDE_WIDTH_IN * OVERLAY_DPI),
      Math.round(overlayHeight * OVERLAY_DPI),
      data.theme.primary,
      COVER_GRADIENT_STOPS,
    );
    slide.addImage({
      data: toDataUri(overlayBuffer),
      x: 0,
      y: OVERLAY_Y,
      w: SLIDE_WIDTH_IN,
      h: overlayHeight,
    });
  } else {
    slide.background = { color: data.theme.primary };
  }

  if (data.agencyLogo.kind === "image") {
    slide.addImage({
      data: toDataUri(data.agencyLogo.data),
      x: CONTENT_MARGIN_X,
      y: 0.472,
      w: data.agencyLogo.sizing.w,
      h: data.agencyLogo.sizing.h,
      sizing: { type: "contain", w: COVER_LOGO_BOX.w, h: COVER_LOGO_BOX.h },
    });
  }

  slide.addText("PROPOSTA DE CRUZEIRO", {
    x: CONTENT_MARGIN_X,
    y: 4.583,
    w: SLIDE_WIDTH_IN - CONTENT_MARGIN_X * 2,
    h: 0.167,
    fontFace: FONT_SANS,
    fontSize: 9.5,
    bold: true,
    charSpacing: 1.8,
    color: data.theme.onPrimary,
  });

  slide.addText(data.shipName, {
    x: CONTENT_MARGIN_X,
    y: 4.778,
    w: SLIDE_WIDTH_IN - CONTENT_MARGIN_X * 2,
    h: 0.778,
    fontFace: FONT_SERIF,
    fontSize: 44,
    bold: true,
    color: data.theme.onPrimary,
  });

  slide.addText(data.tagline, {
    x: CONTENT_MARGIN_X,
    y: 5.583,
    w: SLIDE_WIDTH_IN - CONTENT_MARGIN_X * 2,
    h: 0.306,
    fontFace: FONT_SERIF,
    fontSize: 14,
    italic: true,
    color: data.theme.onPrimary,
  });

  const fields: Array<{ x: number; w: number; label: string; value: string }> = [
    { x: 0.694, w: 2.778, label: "PERÍODO", value: data.period },
    { x: 3.611, w: 2.778, label: "COMPANHIA", value: data.cruiseLine },
    { x: 6.528, w: 2.5, label: "OCUPAÇÃO", value: data.occupancy },
    { x: 9.167, w: 1.944, label: "MOEDA", value: data.currency },
  ];

  for (const field of fields) {
    slide.addShape("rect", {
      x: field.x - 0.139,
      y: 6.194,
      w: 0.021,
      h: 0.472,
      fill: { color: data.theme.onPrimary },
      line: { type: "none" },
    });
    slide.addText(field.label, {
      x: field.x,
      y: 6.194,
      w: field.w,
      h: 0.167,
      fontFace: FONT_SANS,
      fontSize: 8,
      bold: true,
      charSpacing: 1.8,
      color: data.theme.onPrimary,
    });
    slide.addText(field.value, {
      x: field.x,
      y: 6.4,
      w: field.w,
      h: 0.278,
      fontFace: FONT_SANS,
      fontSize: 12.5,
      bold: true,
      color: data.theme.onPrimary,
    });
  }
}
