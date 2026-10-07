import "server-only";

import sharp from "sharp";

import { fetchExternalImage, type FetchedImage } from "@/features/pptx/images/fetch-external-image";
import type { ResolvedImage } from "@/features/pptx/types";

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
 * fetch) — devolve `null` só se a leitura de metadata falhar (buffer
 * corrompido). Complementa `fetchAndSizeImage`, que busca por URL.
 */
export async function sizeImage(fetched: FetchedImage, box: BoxInches): Promise<ResolvedImage | null> {
  try {
    const sizing = await resolveContainSizing(fetched.buffer, box);
    return { kind: "image", data: fetched.buffer, sizing };
  } catch {
    return null;
  }
}
