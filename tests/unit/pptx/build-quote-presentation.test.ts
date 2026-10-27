import JSZip from "jszip";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.stubGlobal("fetch", vi.fn());
// Isola explicitamente da rede real as fontes determinísticas de foto
// (Wikipedia/Google Places): sem isso, o teste dependeria de o `fetch`
// global mockado falhar "por acidente" dentro do try/catch desses módulos
// — frágil caso alguém rode a suíte com GOOGLE_PLACES_API_KEY configurada
// no ambiente.
vi.mock("@/features/pptx/images/wikipedia-photo", () => ({ fetchWikipediaPhoto: vi.fn().mockResolvedValue(null) }));
vi.mock("@/features/pptx/images/google-places-photo", () => ({
  fetchGooglePlacesPhoto: vi.fn().mockResolvedValue(null),
}));

import { buildQuotePresentation } from "@/features/pptx/build-quote-presentation";
import { normalizeQuoteDraft } from "@/features/quotes/schemas/quote-form.schema";
import type { QuoteRecord } from "@/features/quotes/schemas/quote.schema";

function makeQuote(overrides: Partial<QuoteRecord["form"]> = {}, aiOverrides: Record<string, unknown> = {}): QuoteRecord {
  const form = normalizeQuoteDraft({
    general: {
      agency: "Primus Turismo",
      consultant: "Maria Silva",
      destination: "Balneário Camboriú",
      startDate: "2026-11-23",
      endDate: "2026-11-27",
      travelers: "2",
      currency: "Real brasileiro (R$)",
      priceType: "Por casal",
      occupancy: "Duplo",
      isCircuit: false,
      packagePriceTotal: "",
    },
    cover: { tagline: "" },
    inclusions: [
      { id: "1", text: "Traslado aeroporto/hotel/aeroporto" },
      { id: "2", text: "Café da manhã incluso" },
    ],
    hotels: [
      {
        id: "1",
        name: "Hotel Brasil Express",
        city: "",
        mealPlan: "Café da manhã",
        rooms: [{ id: "1", roomType: "Standard", price: "R$ 533,18" }],
      },
    ],
    flights: {
      enabled: true,
      legs: "20JUL - CNF (12:00) / SCL (16:00)",
      baggage: "1 peça de 23 kg por pessoa",
      seat: "Marcação de assento incluso",
      services: "",
    },
    itinerary: { enabled: false },
    agencyLogo: null,
    flightImage: null,
    ...overrides,
  });

  return {
    id: "quote-1",
    status: "done",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    createdBy: "user-1",
    form,
    aiOutput: {
      coverTagline: "Onde o mar encontra os arranha-céus.",
      destinationDescription: "Balneário Camboriú combina praia e vida urbana.",
      destinationAttractions: ["Praia Central", "Parque Unipraias"],
      destinationPhoto: { status: "not_found", url: null, sourceUrl: null, caption: null },
      hotels: [
        {
          name: "Hotel Brasil Express",
          shortDescription: "Hotel econômico bem localizado.",
          location: "Av. Brasil, 1650",
          category: "3 estrelas",
          tripadvisorRating: "3,4 de 5 (31 avaliações)",
          photo: { status: "not_found", url: null, sourceUrl: null, caption: null },
        },
      ],
      flightItinerary: null,
      ...aiOverrides,
    },
  } as QuoteRecord;
}

const supabase = {
  storage: { from: vi.fn().mockReturnValue({ download: vi.fn() }) },
  from: vi.fn().mockReturnValue({
    select: vi.fn().mockReturnValue({ maybeSingle: vi.fn().mockResolvedValue({ data: null }) }),
  }),
} as never;

describe("buildQuotePresentation", () => {
  beforeEach(() => {
    vi.mocked(fetch).mockReset();
  });

  it("lança erro se o status não for 'done'", async () => {
    const quote = { ...makeQuote(), status: "processing" } as QuoteRecord;
    await expect(buildQuotePresentation(supabase, quote)).rejects.toThrow("sem geração concluída");
  });

  it("lança erro se aiOutput for nulo", async () => {
    const quote = { ...makeQuote(), aiOutput: null } as unknown as QuoteRecord;
    await expect(buildQuotePresentation(supabase, quote)).rejects.toThrow("sem geração concluída");
  });

  it("gera um Buffer .pptx válido com a estrutura OOXML esperada", async () => {
    const buffer = await buildQuotePresentation(supabase, makeQuote());

    expect(buffer).toBeInstanceOf(Buffer);
    expect(buffer.byteLength).toBeGreaterThan(0);

    const zip = await JSZip.loadAsync(buffer);
    expect(zip.file("ppt/presentation.xml")).not.toBeNull();
  });

  it("contagem de slides: capa + destino + inclusões + 1 hotel + voos + final = 6 (sem roteiro)", async () => {
    const buffer = await buildQuotePresentation(supabase, makeQuote());
    const zip = await JSZip.loadAsync(buffer);
    const slideFiles = Object.keys(zip.files).filter((name) => /^ppt\/slides\/slide\d+\.xml$/.test(name));
    expect(slideFiles).toHaveLength(6);
  });

  it("sem voos (flights.enabled=false): 1 slide a menos", async () => {
    const buffer = await buildQuotePresentation(
      supabase,
      makeQuote({ flights: { enabled: false } }),
    );
    const zip = await JSZip.loadAsync(buffer);
    const slideFiles = Object.keys(zip.files).filter((name) => /^ppt\/slides\/slide\d+\.xml$/.test(name));
    expect(slideFiles).toHaveLength(5);
  });

  it("com roteiro habilitado: 1 slide a mais", async () => {
    const buffer = await buildQuotePresentation(
      supabase,
      makeQuote({
        itinerary: { enabled: true, days: [{ id: "1", label: "Dia 1", description: "Chegada" }] },
      }),
    );
    const zip = await JSZip.loadAsync(buffer);
    const slideFiles = Object.keys(zip.files).filter((name) => /^ppt\/slides\/slide\d+\.xml$/.test(name));
    expect(slideFiles).toHaveLength(7);
  });

  it("com voos estruturados em ida e volta: 1 slide para cada direção", async () => {
    const buffer = await buildQuotePresentation(
      supabase,
      makeQuote(
        {},
        {
          flightItinerary: {
            legs: [
              {
                direction: "outbound",
                airline: "LATAM Airlines",
                flightNumber: "LA 3555",
                originCode: "CNF",
                originCity: "Belo Horizonte",
                destinationCode: "SCL",
                destinationCity: "Santiago",
                departureTime: "12:00",
                arrivalTime: "16:00",
                duration: "4h00",
              },
              {
                direction: "return",
                airline: "LATAM Airlines",
                flightNumber: "LA 3556",
                originCode: "SCL",
                originCity: "Santiago",
                destinationCode: "CNF",
                destinationCity: "Belo Horizonte",
                departureTime: "17:00",
                arrivalTime: "21:00",
                duration: "4h00",
              },
            ],
            notes: null,
          },
        },
      ),
    );
    const zip = await JSZip.loadAsync(buffer);
    const slideFiles = Object.keys(zip.files).filter((name) => /^ppt\/slides\/slide\d+\.xml$/.test(name));
    // Capa + destino + inclusões + 1 hotel + voos (ida e volta no mesmo slide) + final = 6.
    expect(slideFiles).toHaveLength(6);

    const flightsSlide = await zip.file("ppt/slides/slide5.xml")!.async("string");
    expect(flightsSlide).toContain("LATAM Airlines");
    expect(flightsSlide).toContain("Belo Horizonte");
  });

  it("modo circuito: adiciona o slide de valor do pacote antes dos hotéis", async () => {
    const buffer = await buildQuotePresentation(
      supabase,
      makeQuote({
        general: {
          agency: "Primus Turismo",
          consultant: "Maria Silva",
          destination: "Balneário Camboriú",
          startDate: "2026-11-23",
          endDate: "2026-11-27",
          travelers: "2",
          currency: "Real brasileiro (R$)",
          priceType: "Por família",
          occupancy: "Duplo",
          isCircuit: true,
          packagePriceTotal: "R$ 12.500,00",
        },
      }),
    );
    const zip = await JSZip.loadAsync(buffer);
    const slideFiles = Object.keys(zip.files).filter((name) => /^ppt\/slides\/slide\d+\.xml$/.test(name));
    // Capa + destino + inclusões + valor do pacote + 1 hotel + voos + final = 7.
    expect(slideFiles).toHaveLength(7);

    const packagePriceSlide = await zip.file("ppt/slides/slide4.xml")!.async("string");
    expect(packagePriceSlide).toContain("R$ 12.500,00");
  });

  it("modo padrão (sem circuito): não adiciona o slide de valor do pacote", async () => {
    const buffer = await buildQuotePresentation(supabase, makeQuote());
    const zip = await JSZip.loadAsync(buffer);
    const slideFiles = Object.keys(zip.files).filter((name) => /^ppt\/slides\/slide\d+\.xml$/.test(name));
    expect(slideFiles).toHaveLength(6);
  });

  it("com logo da agência: extrai o tema da logo e aplica a cor nos slides, em vez do navy fixo da SNOW", async () => {
    const sharp = (await import("sharp")).default;
    const goldenLogoBuffer = await sharp({
      create: { width: 200, height: 200, channels: 3, background: { r: 0xd4, g: 0xac, b: 0x34 } },
    })
      .png()
      .toBuffer();

    const supabaseWithLogo = {
      storage: {
        from: vi.fn().mockReturnValue({
          download: vi.fn().mockResolvedValue({ data: new Blob([goldenLogoBuffer]), error: null }),
        }),
      },
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({ maybeSingle: vi.fn().mockResolvedValue({ data: null }) }),
      }),
    } as never;

    const quote = makeQuote({
      agencyLogo: { fileName: "logo.png", storagePath: "quote-1/logo.png", mimeType: "image/png", sizeBytes: 100 },
    });

    const buffer = await buildQuotePresentation(supabaseWithLogo, quote);
    const zip = await JSZip.loadAsync(buffer);
    const slide1Xml = await zip.file("ppt/slides/slide1.xml")!.async("string");

    // Cor extraída da logo dourada sintética — não deve mais aparecer o navy fixo (091B3A) como fundo da capa.
    expect(slide1Xml).not.toContain("091B3A");
  });
});
