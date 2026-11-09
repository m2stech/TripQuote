import { namesAreEquivalent } from "@/features/pptx/fuzzy-name-match";
import type { GeneratedHotel } from "@/features/quotes/schemas/generation-output.schema";
import type { Hotel } from "@/features/quotes/schemas/quote-form.schema";
import type { MatchedHotel } from "@/features/pptx/types";

/**
 * Casa `form.hotels` com `aiOutput.hotels` por nome (tolerante a pequenas
 * divergências de grafia, ver `fuzzy-name-match.ts`), não por índice: o
 * orquestrador do M6 garante mesma contagem e nomes correspondentes, mas não
 * necessariamente a mesma ordem. Hotel sem correspondência (não deveria
 * acontecer, dada a validação do M6, mas o builder trata defensivamente)
 * recebe `ai: null` — o slide usa fallback de descrição vazia/ilustração,
 * nunca omite o hotel.
 */
export function matchHotelsByName(formHotels: Hotel[], aiHotels: GeneratedHotel[]): MatchedHotel[] {
  return formHotels.map((hotel) => ({
    form: hotel,
    ai: aiHotels.find((aiHotel) => namesAreEquivalent(aiHotel.name, hotel.name)) ?? null,
  }));
}
