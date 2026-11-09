import { describe, expect, it } from "vitest";

import { recordPhotoFallbackIfNeeded, type PhotoFallbackEntry } from "@/features/pptx/images/photo-diagnostics";

describe("recordPhotoFallbackIfNeeded", () => {
  it("não registra nada quando a imagem foi resolvida (kind: image)", () => {
    const entries: PhotoFallbackEntry[] = [];
    recordPhotoFallbackIfNeeded(entries, "Hotel: The Ritz Toronto", "image", [
      { source: "Google Places", reason: "sem resultado" },
    ]);
    expect(entries).toEqual([]);
  });

  it("não registra nada quando caiu em placeholder mas não há tentativas (ex.: sem aiPhoto nenhuma)", () => {
    const entries: PhotoFallbackEntry[] = [];
    recordPhotoFallbackIfNeeded(entries, "Cabine: Varanda", "placeholder", []);
    expect(entries).toEqual([]);
  });

  it("registra o motivo quando caiu em placeholder com tentativas (caso relatado: foto de hotel ausente)", () => {
    const entries: PhotoFallbackEntry[] = [];
    const attempts = [
      { source: "Google Places", reason: "GOOGLE_PLACES_API_KEY não configurada" },
      { source: "URL da IA (https://dynamic-media-cdn.tripadvisor.com/foto.jpg)", reason: "HTTP 404" },
      { source: "Retry da IA", reason: "não encontrou foto alternativa" },
    ];

    recordPhotoFallbackIfNeeded(entries, "Hotel: The Ritz Toronto", "placeholder", attempts);

    expect(entries).toEqual([{ subject: "Hotel: The Ritz Toronto", attempts }]);
  });

  it("acumula múltiplas entradas em chamadas sucessivas, sem sobrescrever", () => {
    const entries: PhotoFallbackEntry[] = [];
    recordPhotoFallbackIfNeeded(entries, "Hotel: A", "placeholder", [{ source: "Google Places", reason: "x" }]);
    recordPhotoFallbackIfNeeded(entries, "Hotel: B", "image", []);
    recordPhotoFallbackIfNeeded(entries, "Hotel: C", "placeholder", [{ source: "Wikipedia", reason: "y" }]);

    expect(entries.map((entry) => entry.subject)).toEqual(["Hotel: A", "Hotel: C"]);
  });
});
