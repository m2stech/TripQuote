import type { FlightItinerary, StructuredFlightLeg } from "@/features/quotes/schemas/generation-output.schema";

/**
 * Decide os trechos de voo para o slide: sempre os estruturados pela IA
 * (`flightItinerary.legs`, M6) — a partir do texto digitado e/ou da imagem
 * de comprovante —, pois só eles têm companhia aérea, duração e nome de
 * cidade para o layout em cards (ver `flights-slide.ts`). Sem estruturação
 * (IA indisponível ou não retornou trechos), cai no texto bruto digitado,
 * uma linha por trecho, para nunca perder a informação já digitada pelo
 * usuário mesmo sem o enriquecimento visual.
 */
export interface ResolvedFlightItinerary {
  legs: StructuredFlightLeg[];
  rawLines: string[];
}

export function resolveFlightItinerary(
  formLegs: string,
  flightItinerary: FlightItinerary | null,
): ResolvedFlightItinerary {
  const rawLines = formLegs
    .split(/\r?\n/)
    .map((leg) => leg.trim())
    .filter(Boolean);

  return {
    legs: flightItinerary?.legs ?? [],
    rawLines,
  };
}
