import "server-only";

import sharp from "sharp";

export interface GradientStop {
  /** Posição do stop, de 0 (topo) a 1 (base). */
  offset: number;
  /** Opacidade do stop, de 0 (transparente) a 1 (opaco). */
  opacity: number;
}

/**
 * Pré-renderiza um gradiente linear top-to-bottom como PNG (RGBA), para uso
 * como overlay sobre a foto de destino na capa. Necessário porque o
 * PptxGenJS não suporta `gradFill` via API pública (confirmado no
 * código-fonte do pacote: `genXmlColorSelection` só emite `<a:solidFill>`),
 * mas o formato .pptx nativo (OOXML) suporta gradiente — a única forma
 * determinística de reproduzir o efeito do modelo de referência
 * (`Orcamento_modelo.pptx`) é gerar a imagem em código via Sharp (SVG com
 * `<linearGradient>`, convertido para PNG), não um arquivo estático.
 *
 * Replica os stops exatos extraídos do modelo: cor `091B3A`, alpha
 * 0%→70%→94% nas posições 0%/30%/100%.
 */
export async function renderGradientOverlay(
  widthPx: number,
  heightPx: number,
  colorHex: string,
  stops: GradientStop[],
): Promise<Buffer> {
  const r = parseInt(colorHex.slice(0, 2), 16);
  const g = parseInt(colorHex.slice(2, 4), 16);
  const b = parseInt(colorHex.slice(4, 6), 16);

  const stopsXml = stops
    .map((stop) => `<stop offset="${stop.offset * 100}%" stop-color="rgb(${r},${g},${b})" stop-opacity="${stop.opacity}"/>`)
    .join("");

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${widthPx}" height="${heightPx}">
    <defs>
      <linearGradient id="g" x1="0" y1="0" x2="0" y2="1">${stopsXml}</linearGradient>
    </defs>
    <rect width="${widthPx}" height="${heightPx}" fill="url(#g)"/>
  </svg>`;

  return sharp(Buffer.from(svg)).png().toBuffer();
}

/** Stops exatos do gradiente da capa, extraídos de `Orcamento_modelo.pptx`. */
export const COVER_GRADIENT_STOPS: GradientStop[] = [
  { offset: 0, opacity: 0 },
  { offset: 0.3, opacity: 0.7 },
  { offset: 1, opacity: 0.94 },
];
