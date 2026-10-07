import type { FlightImageExtraction } from "@/features/quotes/schemas/generation-output.schema";

/**
 * Decide a fonte dos trechos de voo para o slide: o texto digitado no
 * formulário é sempre prioritário; na ausência dele (único caso permitido
 * pelo schema quando há imagem de comprovante anexada — ver
 * `quoteFormSchema.superRefine`), usa a extração da IA a partir da imagem
 * (`flightImageExtraction`, M6), juntando uma linha por trecho no mesmo
 * formato que `parseFlightLeg` já interpreta.
 */
const CONTROL_CHARS = /[\x00-\x1F\x7F]/g;

export function resolveFlightLegs(
  formLegs: string,
  flightImageExtraction: FlightImageExtraction | null,
): string {
  if (formLegs) return formLegs;

  // Texto extraído pela IA a partir de OCR da imagem; caracteres de
  // controle ocasionais (ruído de extração) são removidos antes de ir para
  // a tabela do slide — o texto digitado pelo usuário não passa por aqui
  // porque já é descartado no `if` acima.
  return (flightImageExtraction?.extractedLegs ?? [])
    .map((leg) => leg.description.replace(CONTROL_CHARS, "").trim())
    .filter(Boolean)
    .join("\n");
}
