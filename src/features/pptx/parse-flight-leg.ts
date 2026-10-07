export interface ParsedFlightLeg {
  flight: string;
  departure: string;
  arrival: string;
  origin: string;
  destination: string;
}

/**
 * Faz o parsing heurístico de uma linha de trecho de voo (texto livre do
 * formulário, ex.: "20JUL - CNF (12:00) / SCL (16:00)") para as colunas da
 * tabela do slide de voos (Voo/Saída/Chegada/Origem/Destino). O formulário
 * atual não tem campos estruturados para isso — se a linha não casar com o
 * padrão esperado, retorna `null` (o slide cai no fallback de tabela de 1
 * coluna "Trecho" com a linha crua, nunca quebra a geração por formatação
 * inesperada).
 */
export function parseFlightLeg(line: string, index: number): ParsedFlightLeg | null {
  const match = /^(.+?)\s*-\s*([A-Z]{2,4})\s*\(([^)]+)\)\s*\/\s*([A-Z]{2,4})\s*\(([^)]+)\)/.exec(line.trim());
  if (!match) return null;

  const [, date, origin, departureTime, destination, arrivalTime] = match;
  return {
    flight: `${index + 1}`,
    departure: `${date!.trim()} ${departureTime!.trim()}`,
    arrival: arrivalTime!.trim(),
    origin: origin!.trim(),
    destination: destination!.trim(),
  };
}
