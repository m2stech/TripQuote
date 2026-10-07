import { describe, expect, it } from "vitest";

import { matchHotelsByName } from "@/features/pptx/match-hotels";
import type { GeneratedHotel } from "@/features/quotes/schemas/generation-output.schema";
import type { Hotel } from "@/features/quotes/schemas/quote-form.schema";

function makeHotel(name: string): Hotel {
  return { id: name, name, mealPlan: "Café da manhã", rooms: [{ id: "1", text: "Standard | R$ 100,00" }] };
}

function makeGeneratedHotel(name: string): GeneratedHotel {
  return {
    name,
    shortDescription: "desc",
    location: "loc",
    category: "cat",
    tripadvisorRating: "4,5",
    photo: { status: "not_found", url: null, sourceUrl: null, caption: null },
  };
}

describe("matchHotelsByName", () => {
  it("casa hotéis na mesma ordem e nome", () => {
    const formHotels = [makeHotel("Hotel A"), makeHotel("Hotel B")];
    const aiHotels = [makeGeneratedHotel("Hotel A"), makeGeneratedHotel("Hotel B")];

    const result = matchHotelsByName(formHotels, aiHotels);
    expect(result[0]!.ai?.name).toBe("Hotel A");
    expect(result[1]!.ai?.name).toBe("Hotel B");
  });

  it("casa hotéis mesmo em ordem diferente entre form e aiOutput", () => {
    const formHotels = [makeHotel("Hotel A"), makeHotel("Hotel B")];
    const aiHotels = [makeGeneratedHotel("Hotel B"), makeGeneratedHotel("Hotel A")];

    const result = matchHotelsByName(formHotels, aiHotels);
    expect(result[0]!.ai?.name).toBe("Hotel A");
    expect(result[1]!.ai?.name).toBe("Hotel B");
  });

  it("ignora diferenças de espaço e maiúsculas/minúsculas", () => {
    const formHotels = [makeHotel("Hotel Plaza San Francisco")];
    const aiHotels = [makeGeneratedHotel("  hotel plaza san francisco  ")];

    const result = matchHotelsByName(formHotels, aiHotels);
    expect(result[0]!.ai).not.toBeNull();
  });

  it("hotel sem correspondência recebe ai: null, nunca é omitido", () => {
    const formHotels = [makeHotel("Hotel A"), makeHotel("Hotel Sem IA")];
    const aiHotels = [makeGeneratedHotel("Hotel A")];

    const result = matchHotelsByName(formHotels, aiHotels);
    expect(result).toHaveLength(2);
    expect(result[1]!.ai).toBeNull();
  });
});
