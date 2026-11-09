import "server-only";

/**
 * Motivo pelo qual uma única fonte (Google Places, Wikipedia, URL citada
 * pela IA, retry via `findAlternativePhoto`) não produziu uma imagem
 * utilizável — registrado para que uma falha de foto vire diagnóstico em vez
 * de só cair silenciosamente no placeholder (bug relatado: fotos de hotel
 * ausentes no .pptx sem nenhum rastro no log para investigar depois).
 */
export interface PhotoAttempt {
  source: string;
  reason: string;
}

/** Resultado de uma busca de imagem numa única fonte: a imagem obtida, ou o motivo da falha. */
export type FetchAttemptResult<T> = { ok: true; value: T } | { ok: false; reason: string };

export function ok<T>(value: T): FetchAttemptResult<T> {
  return { ok: true, value };
}

export function fail<T>(reason: string): FetchAttemptResult<T> {
  return { ok: false, reason };
}

/**
 * Uma foto que caiu em placeholder depois de esgotar todas as fontes,
 * identificada pelo que ela representa no orçamento (ex.: "Hotel: The Ritz
 * Toronto", "Destino: Santiago") — acumulada pelos builders
 * (`build-quote-presentation.ts`/`build-cruise-presentation.ts`) e gravada
 * em `audit_log` pelo orquestrador (`quote.photo.fallback`), para que a
 * causa de uma foto ausente no .pptx fique auditável depois, em vez de só
 * reproduzível manualmente.
 */
export interface PhotoFallbackEntry {
  subject: string;
  attempts: PhotoAttempt[];
}

/** Acumula em `entries` um fallback apenas quando `attempts` não resultou em imagem (chamar sempre, mesmo em sucesso — não grava nada nesse caso). */
export function recordPhotoFallbackIfNeeded(
  entries: PhotoFallbackEntry[],
  subject: string,
  imageKind: "image" | "placeholder",
  attempts: PhotoAttempt[],
): void {
  if (imageKind === "placeholder" && attempts.length > 0) {
    entries.push({ subject, attempts });
  }
}
