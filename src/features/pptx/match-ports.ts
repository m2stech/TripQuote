import type { GeneratedPort } from "@/features/quotes/schemas/generation-output.schema";

function normalize(name: string): string {
  return name.trim().toLowerCase();
}

/**
 * Casa um nome de porto/destino do roteiro (`form.itinerary[].portOrDestination`)
 * com a entrada correspondente em `aiOutput.ports` (por nome normalizado) —
 * mesmo princípio de `matchHotelsByName`, mas sem garantia de contagem igual:
 * dias de navegação sem escala não geram entrada em `ports`, e a IA pode
 * agrupar escalas repetidas do mesmo porto em uma única entrada.
 */
export function findPortByName(ports: GeneratedPort[], name: string): GeneratedPort | null {
  return ports.find((port) => normalize(port.name) === normalize(name)) ?? null;
}
