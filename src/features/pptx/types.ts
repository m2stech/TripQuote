import type { GeneratedHotel, GenerationOutput } from "@/features/quotes/schemas/generation-output.schema";
import type { Hotel } from "@/features/quotes/schemas/quote-form.schema";

/**
 * Resultado da resolução de uma imagem (logo, foto de destino/hotel): já
 * baixada/normalizada e com o sizing calculado, ou um placeholder quando a
 * imagem não existe/não pôde ser obtida — nunca lança, nunca bloqueia a
 * geração do restante do slide.
 */
export type ResolvedImage =
  | { kind: "image"; data: Buffer; sizing: { w: number; h: number } }
  | { kind: "placeholder" };

/** Hotel do formulário casado com os dados redigidos pela IA (por nome, ver `matchHotelsByName`). */
export interface MatchedHotel {
  form: Hotel;
  ai: GeneratedHotel | null;
}

export type { GenerationOutput };
