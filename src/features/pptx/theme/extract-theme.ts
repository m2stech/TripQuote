import "server-only";

import { Vibrant } from "node-vibrant/node";

import { meetsAccessibleContrast } from "@/features/pptx/theme/contrast";
import { SNOW_COLORS } from "@/features/pptx/tokens";

/**
 * Paleta aplicada aos elementos de destaque do PPTX (numeração de seção,
 * linhas divisórias, blocos "O destino"/info, badges, cards) — ver slides em
 * `features/pptx/slides/`. Cores sempre em hex sem "#", como o resto de
 * `tokens.ts` (PptxGenJS espera esse formato).
 */
export interface PptxTheme {
  /** Cor de fundo dos blocos de destaque (ex.: bloco "O destino", badges). */
  primary: string;
  /** Cor do texto sobre `primary` — sempre "FFFFFF" ou "000000", nunca uma cor extraída (garantido pelo cálculo de contraste). */
  onPrimary: string;
  /** 2ª cor da paleta, usada em elementos menores (numeração "01", linhas finas) como FUNDO. Cai em `primary` se não houver uma 2ª cor utilizável. */
  accent: string;
  /**
   * Cor "de marca" para usar como TEXTO sobre fundo claro (cards claros,
   * fundo de página) — diferente de `primary`/`onPrimary`, que assumem
   * `primary` como fundo. `primary` pode ser uma cor clara (ex.: dourado)
   * seguramente legível como fundo com texto preto, mas ilegível se usada
   * ela mesma como texto sobre um fundo quase branco — por isso este campo
   * garante contraste próprio contra branco, caindo para `SNOW_COLORS.navy`
   * quando `primary` não o atinge.
   */
  textOnLight: string;
}

/** Tema padrão SNOW — usado quando não há logo, a extração falha, ou a logo é neutra demais para render de uma paleta própria. */
export const DEFAULT_THEME: PptxTheme = {
  primary: SNOW_COLORS.navy,
  onPrimary: SNOW_COLORS.white,
  accent: SNOW_COLORS.navy,
  textOnLight: SNOW_COLORS.navy,
};

/** Saturação HSL mínima (0 a 1) para considerar uma cor "characterística" da marca, não cinza/neutra. */
const MIN_SATURATION = 0.12;

interface Candidate {
  hex: string;
  saturation: number;
  population: number;
}

/**
 * Extrai até 2 cores de destaque da logo da agência (`primary` e `accent`),
 * seguindo a diretriz do PRD: analisar a logo e aplicar sua paleta em
 * títulos/linhas/cards/destaques, com contraste garantido, caindo para a
 * identidade SNOW (navy/branco) quando a logo é neutra ou não oferece
 * contraste suficiente. Nunca lança: qualquer falha (buffer inválido,
 * extração sem resultado) devolve `DEFAULT_THEME`.
 */
export async function extractThemeFromLogo(logoBuffer: Buffer): Promise<PptxTheme> {
  try {
    const palette = await Vibrant.from(logoBuffer).getPalette();

    // Swatches diferentes (Vibrant/Muted/Dark.../Light...) do mesmo matiz
    // frequentemente têm saturação quase idêntica a menos de erro de
    // arredondamento de ponto flutuante — por isso o desempate por
    // população usa uma tolerância, em vez de só comparar saturação exata
    // (que nunca empataria de fato e tornaria a ordem efetivamente
    // arbitrária). `population: 0` nos swatches derivados (Dark/Light/Muted)
    // significa "nenhum pixel caiu exatamente nesse valor", então a
    // população real da cor da logo está no swatch `Vibrant`.
    const SATURATION_TOLERANCE = 0.01;
    const candidates: Candidate[] = Object.values(palette)
      .filter((swatch): swatch is NonNullable<typeof swatch> => swatch !== null)
      .map((swatch) => ({
        hex: swatch.hex.replace("#", "").toUpperCase(),
        saturation: swatch.hsl[1],
        population: swatch.population,
      }))
      .filter((candidate) => candidate.saturation >= MIN_SATURATION)
      .sort((a, b) => {
        const saturationDiff = b.saturation - a.saturation;
        if (Math.abs(saturationDiff) > SATURATION_TOLERANCE) return saturationDiff;
        return b.population - a.population;
      });

    if (candidates.length === 0) return DEFAULT_THEME;

    const primaryCandidate = candidates[0]!;
    const onPrimary = meetsAccessibleContrast(primaryCandidate.hex, SNOW_COLORS.white)
      ? SNOW_COLORS.white
      : meetsAccessibleContrast(primaryCandidate.hex, "000000")
        ? "000000"
        : null;

    // Nem branco nem preto alcançam contraste legível sobre esta cor
    // (caso raro, mas possível com tons muito próximos de cinza médio) —
    // mais seguro cair para a identidade SNOW do que arriscar texto ilegível.
    if (!onPrimary) return DEFAULT_THEME;

    const accentCandidate = candidates.find((candidate) => candidate.hex !== primaryCandidate.hex);
    const textOnLight = meetsAccessibleContrast(primaryCandidate.hex, SNOW_COLORS.white)
      ? primaryCandidate.hex
      : SNOW_COLORS.navy;

    return {
      primary: primaryCandidate.hex,
      onPrimary,
      accent: accentCandidate?.hex ?? primaryCandidate.hex,
      textOnLight,
    };
  } catch {
    return DEFAULT_THEME;
  }
}
