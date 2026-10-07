import type pptxgen from "pptxgenjs";

import { CONTENT_MARGIN_X, FONT_SERIF, INNER_LOGO_BOX, SLIDE_WIDTH_IN, SNOW_COLORS } from "@/features/pptx/tokens";
import type { ResolvedImage } from "@/features/pptx/types";

function toDataUri(buffer: Buffer): string {
  return `data:image/png;base64,${buffer.toString("base64")}`;
}

/**
 * Header padrão repetido em todos os slides internos (inclusões, hotéis,
 * voos, roteiro, final) — extraído de `Orcamento_modelo.pptx`: logo da
 * agência pequena no canto superior esquerdo, linha vertical fina, título
 * da seção, e uma linha horizontal fina logo abaixo. Não usado na capa
 * (tela cheia, sem este header).
 */
export function renderInternalHeader(slide: pptxgen.Slide, agencyLogo: ResolvedImage, title: string): void {
  if (agencyLogo.kind === "image") {
    slide.addImage({
      data: toDataUri(agencyLogo.data),
      x: CONTENT_MARGIN_X,
      y: 0.528,
      w: agencyLogo.sizing.w,
      h: agencyLogo.sizing.h,
      sizing: { type: "contain", w: INNER_LOGO_BOX.w, h: INNER_LOGO_BOX.h },
    });
  }

  slide.addShape("rect", {
    x: 1.541,
    y: 0.583,
    w: 0.014,
    h: 0.556,
    fill: { color: SNOW_COLORS.hairline },
    line: { type: "none" },
  });

  slide.addText(title, {
    x: 1.763,
    y: 0.528,
    w: SLIDE_WIDTH_IN - 1.763 - CONTENT_MARGIN_X,
    h: 0.667,
    fontFace: FONT_SERIF,
    fontSize: 24,
    bold: true,
    color: SNOW_COLORS.navy,
    valign: "middle",
  });

  slide.addShape("rect", {
    x: CONTENT_MARGIN_X,
    y: 1.389,
    w: SLIDE_WIDTH_IN - CONTENT_MARGIN_X * 2,
    h: 0.014,
    fill: { color: SNOW_COLORS.hairline },
    line: { type: "none" },
  });
}
