/**
 * Tokens de identidade visual para o builder PPTX. Paleta extraída de
 * `Orcamento_modelo.pptx` (resultado real do fluxo legado prompt + IA,
 * fornecido pelo usuário como referência de design aprovada pelo cliente)
 * — difere da paleta documentada no CLAUDE.md (navy real é mais escuro;
 * blue/orange do CLAUDE.md não aparecem neste template e ficam como
 * reserva, sem uso aqui).
 *
 * PptxGenJS espera hex sem "#" e medidas em polegadas — diferente das
 * variáveis CSS do app (que usam oklch()) e do EMU nativo do OOXML
 * (1" = 914400 EMU).
 */

export const SNOW_COLORS = {
  navy: "091B3A",
  card: "EEF2F7",
  hairline: "D5DDE8",
  hairlineDark: "1E355E",
  label: "4A6491",
  body: "2B3648",
  caption: "5F6B7D",
  white: "FFFFFF",
  /** Reserva do CLAUDE.md: não usados neste template, mas mantidos para outras peças. */
  blue: "008FBD",
  orange: "F26522",
} as const;

export const FONT_SANS = "Calibri";
export const FONT_SERIF = "Cambria";

/** Converte pontos em polegadas (1pt = 1/72in). */
export function pt(points: number): number {
  return points / 72;
}

/** Converte EMU (unidade nativa do OOXML) em polegadas (1" = 914400 EMU). */
export function emu(value: number): number {
  return value / 914400;
}

/** Dimensões do slide, confirmadas em `Orcamento_modelo.pptx` (12192000x6858000 EMU = 16:9). */
export const SLIDE_WIDTH_IN = emu(12192000);
export const SLIDE_HEIGHT_IN = emu(6858000);

/** Margem lateral padrão de conteúdo nos slides internos (consistente em todo o modelo). */
export const CONTENT_MARGIN_X = emu(482600);

/** Logo da agência: maior na capa que nos slides internos (confirmado no modelo). */
export const COVER_LOGO_BOX = { w: emu(979979), h: emu(825500) };
export const INNER_LOGO_BOX = { w: emu(723677), h: emu(609600) };

/** Logo institucional no rodapé do slide final. */
export const FOOTER_LOGO_BOX = { w: emu(599056), h: emu(635000) };

/** Foto de cada hotel (coluna esquerda do slide de hotel). */
export const HOTEL_PHOTO_BOX = { w: emu(5080000), h: emu(3810000) };
