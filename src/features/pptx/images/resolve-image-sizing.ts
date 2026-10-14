import "server-only";

import sharp from "sharp";

import { fetchExternalImage, type FetchedImage } from "@/features/pptx/images/fetch-external-image";
import type { ResolvedImage } from "@/features/pptx/types";

export interface BoxInches {
  w: number;
  h: number;
}

/**
 * DPI de referência para considerar uma imagem "boa o bastante" dentro da
 * caixa onde ela será exibida — abaixo disso ela aparentaria granulada
 * mesmo preenchendo a caixa (bug relatado: fotos de baixa resolução,
 * principalmente vindas da Wikipedia, ficavam visivelmente borradas no
 * slide). 110 DPI é conservador para tela/projeção; menor que os ~150 DPI
 * usados como referência para impressão, mas evita descartar imagens boas
 * só por estarem um pouco abaixo do ideal de impressão.
 */
const MIN_DPI = 110;

/**
 * Resolução mínima (em pixels) que uma imagem precisa ter para não ficar
 * borrada dentro de `box` (dimensões em polegadas) — usado para rejeitar
 * fontes de baixa qualidade (ex.: thumbnails) antes de aceitá-las, em vez
 * de só verificar se o fetch teve sucesso.
 */
export function meetsMinimumResolution(imageWidthPx: number, imageHeightPx: number, box: BoxInches): boolean {
  return imageWidthPx >= box.w * MIN_DPI && imageHeightPx >= box.h * MIN_DPI;
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

async function readPixelDimensions(buffer: Buffer): Promise<{ width: number; height: number } | null> {
  const metadata = await sharp(buffer).metadata();
  if (!metadata.width || !metadata.height) return null;
  return { width: metadata.width, height: metadata.height };
}

/**
 * Busca uma imagem externa e calcula seu sizing numa única chamada,
 * devolvendo `null` em qualquer falha (fetch ou leitura de metadata) —
 * usado por `destination-photo.ts`/`hotel-photo.ts` tanto na tentativa
 * original quanto na de retry (`findAlternativePhoto`), evitando duplicar
 * o par fetch+sizing+try/catch em cada um.
 */
export async function fetchAndSizeImage(url: string, box: BoxInches): Promise<ResolvedImage | null> {
  const fetched = await fetchExternalImage(url);
  if (!fetched) return null;
  return sizeImage(fetched, box);
}

/**
 * Calcula o sizing de uma imagem já obtida (buffer em mãos, ex.: vinda de
 * `fetchWikipediaPhoto`/`fetchGooglePlacesPhoto`, que já fazem seu próprio
 * fetch) — devolve `null` se a leitura de metadata falhar (buffer
 * corrompido) OU se a resolução for baixa demais para `box`
 * (`meetsMinimumResolution`): uma imagem pequena esticada para preencher a
 * caixa fica visivelmente borrada no slide (bug relatado), então é melhor
 * rejeitá-la e deixar quem chama cair no próximo fallback do que aceitá-la
 * só porque o fetch teve sucesso. Complementa `fetchAndSizeImage`, que
 * busca por URL.
 */
export async function sizeImage(fetched: FetchedImage, box: BoxInches): Promise<ResolvedImage | null> {
  try {
    const dimensions = await readPixelDimensions(fetched.buffer);
    if (!dimensions) return null;
    if (!meetsMinimumResolution(dimensions.width, dimensions.height, box)) return null;

    const sizing = await resolveContainSizing(fetched.buffer, box);
    return { kind: "image", data: fetched.buffer, sizing };
  } catch {
    return null;
  }
}
