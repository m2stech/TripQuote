import type pptxgen from "pptxgenjs";

import { renderInternalHeader } from "@/features/pptx/slides/internal-header";
import { CONTENT_MARGIN_X, FONT_SANS, FONT_SERIF, FOOTER_LOGO_BOX, SLIDE_HEIGHT_IN, SLIDE_WIDTH_IN, SNOW_COLORS } from "@/features/pptx/tokens";
import type { ResolvedImage } from "@/features/pptx/types";
import { FIXED_INSTITUTIONAL_FOOTER, FIXED_PAYMENT_TERMS } from "@/features/quotes/schemas/quote-form.schema";

export interface FinalSlideData {
  institutionalLogo: ResolvedImage;
}

const TITLE = "Condições de pagamento";

const IMPORTANT_NOTES = [
  "Tarifas e disponibilidade sujeitas à confirmação no momento da reserva.",
  "Valores sujeitos a alteração até a efetivação da compra.",
  "Serviços sujeitos às regras dos respectivos fornecedores.",
];

function toDataUri(buffer: Buffer): string {
  return `data:image/png;base64,${buffer.toString("base64")}`;
}

/** As 4 linhas de FIXED_PAYMENT_TERMS: 3 formas de pagamento + 1 observação, no formato "Título: descrição". */
function parsePaymentTerms(): { title: string; description: string }[] {
  const lines = FIXED_PAYMENT_TERMS.split("\n");
  return lines.map((line) => {
    const separatorIndex = line.indexOf(":");
    if (separatorIndex === -1) return { title: "", description: line };
    return {
      title: line.slice(0, separatorIndex + 1),
      description: line.slice(separatorIndex + 1).trim(),
    };
  });
}

/**
 * Pagamento + rodapé institucional: 3 cards de forma de pagamento, faixa de
 * observação (valor mínimo por parcela), lista de informações importantes
 * fixas, e o rodapé institucional (logo "Operado por SNOW" + texto fixo) —
 * só neste slide, não faz parte do header compartilhado.
 */
export function buildFinalSlide(pres: pptxgen, data: FinalSlideData): void {
  const slide = pres.addSlide();
  renderInternalHeader(slide, { kind: "placeholder" }, TITLE);

  const terms = parsePaymentTerms();
  const paymentCards = terms.slice(0, 3);
  const observation = terms[3];

  const cardW = 3.98;
  const cardH = 1.833;
  const gap = 0.333;
  const cardsY = 1.611;

  paymentCards.forEach((term, index) => {
    const x = CONTENT_MARGIN_X + index * (cardW + gap);
    slide.addShape("roundRect", {
      x,
      y: cardsY,
      w: cardW,
      h: cardH,
      rectRadius: 0.06,
      fill: { color: SNOW_COLORS.card },
      line: { type: "none" },
    });
    slide.addShape("rect", {
      x: x + 0.2,
      y: cardsY + 0.2,
      w: 0.5,
      h: 0.042,
      fill: { color: SNOW_COLORS.navy },
      line: { type: "none" },
    });
    slide.addText(term.title, {
      x: x + 0.2,
      y: cardsY + 0.3,
      w: cardW - 0.4,
      h: 0.45,
      fontFace: FONT_SERIF,
      fontSize: 17,
      bold: true,
      color: SNOW_COLORS.navy,
      lineSpacingMultiple: 1.1,
    });
    slide.addText(term.description, {
      x: x + 0.2,
      y: cardsY + 0.8,
      w: cardW - 0.4,
      h: cardH - 1,
      fontFace: FONT_SANS,
      fontSize: 14,
      color: SNOW_COLORS.body,
      lineSpacingMultiple: 1.1,
    });
  });

  const observationY = 3.639;
  slide.addShape("roundRect", {
    x: CONTENT_MARGIN_X,
    y: observationY,
    w: SLIDE_WIDTH_IN - CONTENT_MARGIN_X * 2,
    h: 0.639,
    rectRadius: 0.1,
    fill: { type: "none" },
    line: { color: SNOW_COLORS.navy, width: 0.75 },
  });
  if (observation) {
    slide.addText(
      [
        { text: observation.title + " ", options: { bold: true, color: SNOW_COLORS.navy } },
        { text: observation.description, options: { color: SNOW_COLORS.body } },
      ],
      {
        x: CONTENT_MARGIN_X + 0.2,
        y: observationY,
        w: SLIDE_WIDTH_IN - CONTENT_MARGIN_X * 2 - 0.4,
        h: 0.639,
        fontFace: FONT_SANS,
        fontSize: 14,
        valign: "middle",
      },
    );
  }

  slide.addText("INFORMAÇÕES IMPORTANTES", {
    x: CONTENT_MARGIN_X,
    y: 4.591,
    w: SLIDE_WIDTH_IN - CONTENT_MARGIN_X * 2,
    h: 0.167,
    fontFace: FONT_SANS,
    fontSize: 9.5,
    bold: true,
    charSpacing: 1.8,
    color: SNOW_COLORS.label,
  });

  IMPORTANT_NOTES.forEach((note, index) => {
    const y = 4.958 + index * 0.444;
    slide.addShape("diamond", {
      x: CONTENT_MARGIN_X,
      y: y + 0.07,
      w: 0.111,
      h: 0.111,
      fill: { color: SNOW_COLORS.navy },
      line: { type: "none" },
    });
    slide.addText(note, {
      x: CONTENT_MARGIN_X + 0.25,
      y,
      w: SLIDE_WIDTH_IN - CONTENT_MARGIN_X * 2 - 0.25,
      h: 0.35,
      fontFace: FONT_SANS,
      fontSize: 13,
      color: SNOW_COLORS.body,
    });
  });

  const footerY = SLIDE_HEIGHT_IN - 0.833;
  slide.addShape("rect", {
    x: 0,
    y: footerY,
    w: SLIDE_WIDTH_IN,
    h: 0.833,
    fill: { color: SNOW_COLORS.card },
    line: { type: "none" },
  });
  slide.addShape("rect", {
    x: 0,
    y: footerY,
    w: SLIDE_WIDTH_IN,
    h: 0.014,
    fill: { color: SNOW_COLORS.hairline },
    line: { type: "none" },
  });

  if (data.institutionalLogo.kind === "image") {
    slide.addImage({
      data: toDataUri(data.institutionalLogo.data),
      x: CONTENT_MARGIN_X,
      y: footerY + 0.069,
      w: data.institutionalLogo.sizing.w,
      h: data.institutionalLogo.sizing.h,
      sizing: { type: "contain", w: FOOTER_LOGO_BOX.w, h: FOOTER_LOGO_BOX.h },
    });
  }

  slide.addText(FIXED_INSTITUTIONAL_FOOTER, {
    x: CONTENT_MARGIN_X + FOOTER_LOGO_BOX.w + 0.2,
    y: footerY,
    w: SLIDE_WIDTH_IN - CONTENT_MARGIN_X * 2 - FOOTER_LOGO_BOX.w - 0.2,
    h: 0.833,
    fontFace: FONT_SANS,
    fontSize: 11.5,
    color: SNOW_COLORS.navy,
    valign: "middle",
  });
}
