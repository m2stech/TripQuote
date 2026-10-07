import "server-only";

import sharp from "sharp";

/** Lado máximo (largura ou altura) após normalização, em pixels. */
const MAX_DIMENSION = 1600;

/**
 * Normaliza uma imagem enviada pelo usuário (logo, imagem de voo) sem
 * distorcer proporção: apenas reduz quando excede `MAX_DIMENSION`, preserva
 * o formato original e remove metadados (EXIF) por privacidade/tamanho.
 */
export async function normalizeImage(buffer: Buffer): Promise<Buffer> {
  return sharp(buffer)
    .rotate()
    .resize({
      width: MAX_DIMENSION,
      height: MAX_DIMENSION,
      fit: "inside",
      withoutEnlargement: true,
    })
    .toBuffer();
}
