import type { RoomOption } from "@/features/quotes/schemas/quote-form.schema";

export interface ParsedRoom {
  roomType: string;
  price: string;
}

/** Detecta um texto que já é, sozinho, um valor monetário (ex.: "R$ 34.814,20", "US$ 500", "1.325 USD"). */
const MONETARY_VALUE_PATTERN =
  /^(?:r\$|us\$|u\$\$|\$|€)\s*[\d.,]+$|^[\d.,]+\s*(?:r\$|us\$|u\$\$|\$|€|reais|usd|eur)$/i;

/**
 * Faz o parsing do texto livre de uma acomodação ("Tipo | Valor", ex.:
 * "Standard | R$ 10.000,00") em tipo de quarto + preço, para os mini-cards
 * do slide de hotel. Nunca lança: texto sem separador vira só `roomType`,
 * com `price` vazio — exceto quando esse texto já é, sozinho, um valor
 * monetário reconhecível (usuário preencheu só o preço, esquecendo o "Tipo |"
 * na frente) — nesse caso vira `price`, para não exibir o valor como se fosse
 * o tipo de quarto e, embaixo dele, "Consulte valores" (bug relatado por
 * cliente: card de acomodação com o preço aparecendo como se fosse o tipo de
 * quarto, seguido de um "Consulte valores" sem sentido).
 */
export function parseRoom(room: RoomOption): ParsedRoom {
  const parts = room.text.split("|").map((part) => part.trim());
  if (parts.length >= 2) {
    return { roomType: parts[0]!, price: parts.slice(1).join(" | ") };
  }

  const text = parts[0] ?? room.text;
  if (MONETARY_VALUE_PATTERN.test(text)) {
    return { roomType: "", price: text };
  }
  return { roomType: text, price: "" };
}
