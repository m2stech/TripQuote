import type pptxgen from "pptxgenjs";

import { renderInternalHeader } from "@/features/pptx/slides/internal-header";
import { CONTENT_MARGIN_X, FONT_SANS, SLIDE_WIDTH_IN, SNOW_COLORS } from "@/features/pptx/tokens";
import type { ResolvedImage } from "@/features/pptx/types";
import type { ItineraryDay } from "@/features/quotes/schemas/quote-form.schema";

export interface ItinerarySlideData {
  days: ItineraryDay[];
  agencyLogo: ResolvedImage;
}

const TITLE = "Programação dia a dia";
const MAX_DAYS_PER_SLIDE = 6;
const ROW_H = 0.75;
const ROWS_START_Y = 1.639;

function renderDays(slide: pptxgen.Slide, days: ItineraryDay[]): void {
  days.forEach((day, index) => {
    const y = ROWS_START_Y + index * ROW_H;
    slide.addShape("roundRect", {
      x: CONTENT_MARGIN_X,
      y,
      w: SLIDE_WIDTH_IN - CONTENT_MARGIN_X * 2,
      h: ROW_H - 0.1,
      rectRadius: 0.06,
      fill: { color: SNOW_COLORS.card },
      line: { type: "none" },
    });
    slide.addText(day.label, {
      x: CONTENT_MARGIN_X + 0.2,
      y,
      w: 2,
      h: ROW_H - 0.1,
      fontFace: FONT_SANS,
      fontSize: 12,
      bold: true,
      color: SNOW_COLORS.navy,
      valign: "middle",
    });
    slide.addText(day.description, {
      x: CONTENT_MARGIN_X + 2.3,
      y,
      w: SLIDE_WIDTH_IN - CONTENT_MARGIN_X * 2 - 2.5,
      h: ROW_H - 0.1,
      fontFace: FONT_SANS,
      fontSize: 11,
      color: SNOW_COLORS.body,
      valign: "middle",
    });
  });
}

function buildItinerarySlidePage(pres: pptxgen, data: ItinerarySlideData, days: ItineraryDay[], isContinuation: boolean): void {
  const slide = pres.addSlide();
  renderInternalHeader(slide, data.agencyLogo, isContinuation ? `${TITLE} (continuação)` : TITLE);
  renderDays(slide, days);
}

/**
 * Roteiro dia a dia (seção opcional do formulário): sem exemplo em
 * `Orcamento_modelo.pptx` (vazio nesse orçamento específico), segue a
 * paleta revisada por consistência. Pagina em slides de continuação
 * quando há mais dias do que cabe em um slide, nunca omitindo.
 */
export function buildItinerarySlide(pres: pptxgen, data: ItinerarySlideData): void {
  if (data.days.length <= MAX_DAYS_PER_SLIDE) {
    buildItinerarySlidePage(pres, data, data.days, false);
    return;
  }

  for (let i = 0; i < data.days.length; i += MAX_DAYS_PER_SLIDE) {
    const page = data.days.slice(i, i + MAX_DAYS_PER_SLIDE);
    buildItinerarySlidePage(pres, data, page, i > 0);
  }
}
