import { describe, expect, it } from "vitest";

import { resolveFlightItinerary } from "@/features/pptx/resolve-flight-itinerary";
import type { FlightItinerary } from "@/features/quotes/schemas/generation-output.schema";

const itinerary: FlightItinerary = {
  legs: [
    {
      direction: "outbound",
      airline: "LATAM Airlines",
      flightNumber: "LA 3555",
      originCode: "CNF",
      originCity: "Belo Horizonte",
      destinationCode: "GRU",
      destinationCity: "São Paulo",
      departureTime: "10h20",
      arrivalTime: "11h40",
      duration: "1h20",
    },
  ],
  notes: null,
};

describe("resolveFlightItinerary", () => {
  it("retorna os trechos estruturados pela IA quando presentes", () => {
    const result = resolveFlightItinerary("20JUL - CNF (12:00) / SCL (16:00)", itinerary);
    expect(result.legs).toEqual(itinerary.legs);
  });

  it("sem estruturação da IA, retorna legs vazio e as linhas cruas digitadas", () => {
    const result = resolveFlightItinerary("20JUL - CNF (12:00) / SCL (16:00)\n\n27JUL - SCL (16:00) / CNF (20:00)", null);
    expect(result.legs).toEqual([]);
    expect(result.rawLines).toEqual([
      "20JUL - CNF (12:00) / SCL (16:00)",
      "27JUL - SCL (16:00) / CNF (20:00)",
    ]);
  });

  it("sem texto digitado nem estruturação, retorna ambos vazios", () => {
    const result = resolveFlightItinerary("", null);
    expect(result.legs).toEqual([]);
    expect(result.rawLines).toEqual([]);
  });
});
