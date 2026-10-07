import type { GeneratedHotel } from "@/features/quotes/schemas/generation-output.schema";
import type { Hotel } from "@/features/quotes/schemas/quote-form.schema";
import type { MatchedHotel } from "@/features/pptx/types";

function normalize(name: string): string {
  return name.trim().toLowerCase();
}

/**
 * Casa `form.hotels` com `aiOutput.hotels` por nome (normalizado), não por
 * índice: o orquestrador do M6 garante mesma contagem e nomes
 * correspondentes, mas não necessariamente a mesma ordem. Hotel sem
 * correspondência (não deveria acontecer, dada a validação do M6, mas o
 * builder trata defensivamente) recebe `ai: null` — o slide usa fallback
 * de descrição vazia/ilustração, nunca omite o hotel.
 */
export function matchHotelsByName(formHotels: Hotel[], aiHotels: GeneratedHotel[]): MatchedHotel[] {
  return formHotels.map((hotel) => ({
    form: hotel,
    ai: aiHotels.find((aiHotel) => normalize(aiHotel.name) === normalize(hotel.name)) ?? null,
  }));
}
