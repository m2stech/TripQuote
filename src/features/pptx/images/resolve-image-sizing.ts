import "server-only";

import sharp from "sharp";

export interface BoxInches {
  w: number;
  h: number;
}

/**
 * Calcula as dimensões finais (em polegadas) que encaixam a imagem numa
 * caixa fixa sem distorcer a proporção — mesma lógica de `fit: "inside"`
 * já usada em `normalizeImage` (`src/lib/utils/image.ts`), mas aplicada ao
 * cálculo de `sizing`/`w`/`h` do PptxGenJS em vez de a um resize de buffer.
 * O resultado deve ser usado tanto em `sizing: {type:"contain", w, h}`
 * quanto no `w`/`h` do próprio `addImage` — precisam bater, senão a imagem
 * é cortada/distorcida dentro do quadro declarado.
 */
export async function resolveContainSizing(buffer: Buffer, box: BoxInches): Promise<BoxInches> {
  const metadata = await sharp(buffer).metadata();
  const width = metadata.width ?? box.w;
  const height = metadata.height ?? box.h;

  const boxRatio = box.w / box.h;
  const imageRatio = width / height;

  if (imageRatio > boxRatio) {
    return { w: box.w, h: box.w / imageRatio };
  }
  return { w: box.h * imageRatio, h: box.h };
}
