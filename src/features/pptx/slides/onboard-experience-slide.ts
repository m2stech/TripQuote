import type pptxgen from "pptxgenjs";

import { renderInternalHeader } from "@/features/pptx/slides/internal-header";
import type { PptxTheme } from "@/features/pptx/theme/extract-theme";
import { CONTENT_MARGIN_X, FONT_SANS, SLIDE_HEIGHT_IN, SLIDE_WIDTH_IN, SNOW_COLORS } from "@/features/pptx/tokens";
import type { ResolvedImage } from "@/features/pptx/types";

export interface OnboardExperienceSlideData {
  onboardExperience: string;
  agencyLogo: ResolvedImage;
  theme: PptxTheme;
}

const TITLE = "A experiência a bordo";
const BLOCK_Y = 1.639;

/**
 * Slide de texto corrido sobre a experiência a bordo (entretenimento,
 * gastronomia, lazer, experiências exclusivas) — redigido pela IA a partir
 * de pesquisa pública (`onboardExperience`, ver prompt seed de cruzeiro).
 * Layout simples (card único com bloco de texto), sem necessidade de
 * paginação: o prompt pede um texto breve, não um roteiro extenso.
 */
export function buildOnboardExperienceSlide(pres: pptxgen, data: OnboardExperienceSlideData): void {
  const slide = pres.addSlide();
  renderInternalHeader(slide, data.agencyLogo, TITLE, data.theme);

  const blockW = SLIDE_WIDTH_IN - CONTENT_MARGIN_X * 2;
  const blockH = SLIDE_HEIGHT_IN - BLOCK_Y - 0.4;

  slide.addShape("roundRect", {
    x: CONTENT_MARGIN_X,
    y: BLOCK_Y,
    w: blockW,
    h: blockH,
    rectRadius: 0.08,
    fill: { color: SNOW_COLORS.card },
    line: { type: "none" },
  });

  slide.addText(data.onboardExperience, {
    x: CONTENT_MARGIN_X + 0.333,
    y: BLOCK_Y + 0.333,
    w: blockW - 0.667,
    h: blockH - 0.667,
    fontFace: FONT_SANS,
    fontSize: 15,
    color: SNOW_COLORS.body,
    lineSpacingMultiple: 1.3,
    valign: "top",
  });
}
