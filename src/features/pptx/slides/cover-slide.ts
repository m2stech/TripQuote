import type pptxgen from "pptxgenjs";

import { renderGradientOverlay, COVER_GRADIENT_STOPS } from "@/features/pptx/images/render-gradient-overlay";
import { CONTENT_MARGIN_X, COVER_LOGO_BOX, FONT_SANS, FONT_SERIF, SLIDE_HEIGHT_IN, SLIDE_WIDTH_IN, SNOW_COLORS } from "@/features/pptx/tokens";
import type { ResolvedImage } from "@/features/pptx/types";

/** DPI usado para converter a área do overlay (polegadas) em pixels ao gerar o PNG do gradiente. */
const OVERLAY_DPI = 150;

/** Altura do overlay a partir do topo do slide, em polegadas (extraído de `Orcamento_modelo.pptx`: y=2.915"). */
const OVERLAY_Y = 2.915;

export interface CoverSlideData {
  destination: string;
  consultant: string;
  tagline: string;
  period: string;
  travelers: string;
  priceInfo: string;
  agencyLogo: ResolvedImage;
  destinationPhoto: ResolvedImage;
}

function toDataUri(buffer: Buffer, mime = "image/png"): string {
  return `data:${mime};base64,${buffer.toString("base64")}`;
}

/**
 * Capa: foto do destino (quando a IA encontrou uma foto real confirmada) ou,
 * na ausência dela, fundo sólido navy — com um overlay de gradiente
 * pré-renderizado (ver `render-gradient-overlay.ts`) para legibilidade do
 * texto, replicando `Orcamento_modelo.pptx`. Logo da agência, destino,
 * tagline e os 4 campos (período/base/valores/consultor) sobrepostos como
 * texto nativo. Consultor aparece só nesta capa.
 */
export async function buildCoverSlide(pres: pptxgen, data: CoverSlideData): Promise<void> {
  const slide = pres.addSlide();

  if (data.destinationPhoto.kind === "image") {
    // Exceção deliberada à regra geral de `sizing: contain`: este é o único
    // quadro da apresentação pensado como fundo full-bleed (hero de capa,
    // replicando `Orcamento_modelo.pptx`), não uma foto emoldurada — usar
    // `contain` aqui deixaria faixas vazias nas laterais/topo sempre que a
    // proporção da foto não for exatamente 16:9. O campo `sizing` calculado
    // por `resolveDestinationPhoto` (preservação de proporção) não se aplica
    // a este caso e é intencionalmente ignorado.
    slide.addImage({
      data: toDataUri(data.destinationPhoto.data),
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
      SNOW_COLORS.navy,
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
    slide.background = { color: SNOW_COLORS.navy };
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

  slide.addText("PROPOSTA DE VIAGEM", {
    x: CONTENT_MARGIN_X,
    y: 4.583,
    w: SLIDE_WIDTH_IN - CONTENT_MARGIN_X * 2,
    h: 0.167,
    fontFace: FONT_SANS,
    fontSize: 9.5,
    bold: true,
    charSpacing: 1.8,
    color: SNOW_COLORS.card,
  });

  slide.addText(data.destination, {
    x: CONTENT_MARGIN_X,
    y: 4.778,
    w: SLIDE_WIDTH_IN - CONTENT_MARGIN_X * 2,
    h: 0.778,
    fontFace: FONT_SERIF,
    fontSize: 44,
    bold: true,
    color: SNOW_COLORS.white,
  });

  slide.addText(data.tagline, {
    x: CONTENT_MARGIN_X,
    y: 5.583,
    w: SLIDE_WIDTH_IN - CONTENT_MARGIN_X * 2,
    h: 0.306,
    fontFace: FONT_SERIF,
    fontSize: 14,
    italic: true,
    color: SNOW_COLORS.card,
  });

  const fields: Array<{ x: number; w: number; label: string; value: string }> = [
    { x: 0.694, w: 2.5, label: "PERÍODO", value: data.period },
    { x: 3.361, w: 1.194, label: "BASE", value: data.travelers },
    { x: 4.722, w: 3.444, label: "VALORES", value: data.priceInfo },
    { x: 8.333, w: 2.778, label: "CONSULTOR", value: data.consultant },
  ];

  for (const field of fields) {
    slide.addShape("rect", {
      x: field.x - 0.139,
      y: 6.194,
      w: 0.021,
      h: 0.472,
      fill: { color: SNOW_COLORS.card },
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
      color: SNOW_COLORS.card,
    });
    slide.addText(field.value, {
      x: field.x,
      y: 6.4,
      w: field.w,
      h: 0.278,
      fontFace: FONT_SANS,
      fontSize: 12.5,
      bold: true,
      color: SNOW_COLORS.white,
    });
  }
}
