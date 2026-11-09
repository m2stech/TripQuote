/**
 * Compara nomes tolerando pequenas divergências de grafia que a IA introduz
 * ao "corrigir" nomes próprios digitados pelo usuário (ex.: form tem "Quebec
 * City Marriot Downtown", a IA responde "Marriott" com dois T) — uma
 * comparação por string exata (mesmo normalizada em maiúsculas/espaços) trata
 * isso como hotéis diferentes, causando falso negativo de cobertura
 * (`generate-quote-content.ts`) e perda do conteúdo gerado pela IA no builder
 * PPTX (`match-hotels.ts`/`match-ports.ts`).
 */

function normalize(name: string): string {
  return name
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

/** Distância de Levenshtein (nº mínimo de inserções/remoções/substituições para igualar as strings). */
function levenshteinDistance(a: string, b: string): number {
  const rows = a.length + 1;
  const cols = b.length + 1;
  const distances: number[][] = Array.from({ length: rows }, (_, i) => [
    i,
    ...Array.from({ length: cols - 1 }, () => 0),
  ]);
  for (let col = 1; col < cols; col += 1) distances[0]![col] = col;

  for (let row = 1; row < rows; row += 1) {
    for (let col = 1; col < cols; col += 1) {
      const cost = a[row - 1] === b[col - 1] ? 0 : 1;
      distances[row]![col] = Math.min(
        distances[row - 1]![col]! + 1,
        distances[row]![col - 1]! + 1,
        distances[row - 1]![col - 1]! + cost,
      );
    }
  }

  return distances[rows - 1]![cols - 1]!;
}

/**
 * Diferença máxima absoluta (em caracteres) tolerada mesmo em nomes longos —
 * cobre erros de digitação e pequenas correções de grafia (ex.
 * "Marriot"/"Marriott", 1 caractere) sem arriscar casar nomes de fato
 * distintos.
 */
const MAX_ABSOLUTE_EDIT_DISTANCE = 2;

/**
 * Diferença máxima tolerada como fração do comprimento do nome mais longo —
 * necessário além do limite absoluto porque, em nomes curtos (ex. "Hotel A"
 * x "Hotel B"), uma distância de 1-2 caracteres já é grande o bastante para
 * ser um hotel genuinamente diferente, não um erro de grafia.
 */
const MAX_RELATIVE_EDIT_DISTANCE = 0.12;

/**
 * Compara dois nomes tolerando acentuação, caixa, espaçamento e pequenas
 * divergências de grafia (distância de edição baixa, relativa ao tamanho do
 * nome). Usado para casar entradas do formulário com a resposta da IA, nunca
 * para decidir se dois hotéis/portos digitados pelo usuário são o mesmo.
 */
export function namesAreEquivalent(a: string, b: string): boolean {
  const normalizedA = normalize(a);
  const normalizedB = normalize(b);
  if (normalizedA === normalizedB) return true;

  const distance = levenshteinDistance(normalizedA, normalizedB);
  const longerLength = Math.max(normalizedA.length, normalizedB.length);
  const relativeLimit = Math.floor(longerLength * MAX_RELATIVE_EDIT_DISTANCE);

  return distance <= Math.min(MAX_ABSOLUTE_EDIT_DISTANCE, relativeLimit);
}
