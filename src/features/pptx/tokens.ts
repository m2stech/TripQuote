/**
 * Tokens de identidade visual SNOW (CLAUDE.md) para o builder PPTX.
 * PptxGenJS espera hex sem "#" e medidas em polegadas — diferente das
 * variáveis CSS do app (que usam oklch()) e das medidas em pontos do
 * protótipo de referência (`docs/reference/Prompt_orcamento_SNOW.html`).
 */

export const SNOW_COLORS = {
  navy: "122B45",
  blue: "008FBD",
  orange: "F26522",
  bg: "F3F7FA",
  line: "D9E4EB",
  muted: "5C7180",
  heroStart: "102B43",
  heroEnd: "175171",
  white: "FFFFFF",
} as const;

export const FONT_FACE = "Arial";

/** Converte pontos (unidade do protótipo original) em polegadas (unidade do PptxGenJS). */
export function pt(points: number): number {
  return points / 72;
}

/** Dimensões do slide em LAYOUT_WIDE (13.33" x 7.5", padrão PptxGenJS). */
export const SLIDE_WIDTH_IN = 13.33;
export const SLIDE_HEIGHT_IN = 7.5;

/** Quadro da logo da agência na capa: máx. 150x65pt (seção 3 do protótipo). */
export const COVER_LOGO_BOX = { w: pt(150), h: pt(65) };

/** Quadro da logo da agência nos slides internos: máx. 110x48pt, a 38pt da esquerda/topo. */
export const INNER_LOGO_BOX = { w: pt(110), h: pt(48) };
export const INNER_LOGO_MARGIN = pt(38);

/** Quadro da foto de cada hotel. */
export const HOTEL_PHOTO_BOX = { w: pt(260), h: pt(180) };

/** Quadro da foto de destino na capa. */
export const DESTINATION_PHOTO_BOX = { w: SLIDE_WIDTH_IN, h: SLIDE_HEIGHT_IN };

/** Quadro da logo institucional no rodapé: máx. 12% da altura do slide. */
export const FOOTER_LOGO_BOX = { w: pt(140), h: SLIDE_HEIGHT_IN * 0.12 };

/** Espaçamento mínimo entre caixas de info do hotel e fonte mínima (seção 5 do protótipo). */
export const HOTEL_INFO_GAP = pt(10);
export const HOTEL_INFO_MIN_FONT_SIZE = 7;
