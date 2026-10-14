/**
 * Contraste WCAG 2.x (fórmula de luminosidade relativa) — usado para decidir
 * se uma cor extraída da logo da agência serve como fundo de bloco com
 * texto branco por cima, ou se precisa cair para um fallback mais escuro.
 * Função pura, sem I/O, para ser testável sem mocks.
 */

const AA_MIN_CONTRAST = 4.5;

function hexToRgb(hex: string): [number, number, number] {
  const normalized = hex.replace("#", "");
  const r = parseInt(normalized.slice(0, 2), 16);
  const g = parseInt(normalized.slice(2, 4), 16);
  const b = parseInt(normalized.slice(4, 6), 16);
  return [r, g, b];
}

function channelLuminance(channel8Bit: number): number {
  const s = channel8Bit / 255;
  return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
}

/** Luminosidade relativa (0 a 1) de uma cor hex (sem "#"), fórmula WCAG. */
export function relativeLuminance(hex: string): number {
  const [r, g, b] = hexToRgb(hex);
  return 0.2126 * channelLuminance(r) + 0.7152 * channelLuminance(g) + 0.0722 * channelLuminance(b);
}

/** Razão de contraste WCAG entre duas cores hex (sem "#"); sempre >= 1. */
export function contrastRatio(hexA: string, hexB: string): number {
  const lumA = relativeLuminance(hexA);
  const lumB = relativeLuminance(hexB);
  const [lighter, darker] = lumA > lumB ? [lumA, lumB] : [lumB, lumA];
  return (lighter + 0.05) / (darker + 0.05);
}

/** `true` se o contraste entre as duas cores atende ao mínimo AA para texto (4.5:1). */
export function meetsAccessibleContrast(hexA: string, hexB: string): boolean {
  return contrastRatio(hexA, hexB) >= AA_MIN_CONTRAST;
}
