import type { RoomOption } from "@/features/quotes/schemas/quote-form.schema";

export interface ParsedRoom {
  roomType: string;
  price: string;
}

/**
 * Faz o parsing do texto livre de uma acomodação ("Tipo | Valor", ex.:
 * "Standard | R$ 10.000,00") em tipo de quarto + preço, para os mini-cards
 * do slide de hotel. Nunca lança: texto sem separador vira só `roomType`,
 * com `price` vazio — o card renderiza mesmo assim, sem valor em destaque.
 */
export function parseRoom(room: RoomOption): ParsedRoom {
  const parts = room.text.split("|").map((part) => part.trim());
  if (parts.length >= 2) {
    return { roomType: parts[0]!, price: parts.slice(1).join(" | ") };
  }
  return { roomType: parts[0] ?? room.text, price: "" };
}
