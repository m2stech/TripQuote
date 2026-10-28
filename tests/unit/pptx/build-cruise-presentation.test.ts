import JSZip from "jszip";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.stubGlobal("fetch", vi.fn());
vi.mock("@/features/pptx/images/wikipedia-photo", () => ({ fetchWikipediaPhoto: vi.fn().mockResolvedValue(null) }));
vi.mock("@/features/pptx/images/google-places-photo", () => ({
  fetchGooglePlacesPhoto: vi.fn().mockResolvedValue(null),
}));

import { buildCruisePresentation, type CruiseQuoteRecord } from "@/features/pptx/build-cruise-presentation";
import { normalizeCruiseDraft, type CruiseFormValues } from "@/features/quotes/schemas/cruise-form.schema";

function makeQuote(
  overrides: Partial<CruiseFormValues> = {},
  aiOverrides: Record<string, unknown> = {},
): CruiseQuoteRecord {
  const form = normalizeCruiseDraft({
    productType: "cruzeiro",
    general: {
      agency: "Primus Turismo",
      consultant: "Maria Silva",
      cruiseLine: "MSC Cruzeiros",
      shipName: "MSC Seaside",
      destination: "Costa brasileira",
      embarkationPort: "Santos",
      disembarkationPort: "Santos",
      embarkationDate: "2026-12-10",
      disembarkationDate: "2026-12-17",
      tripProfile: "Famílias",
      occupancy: "2 adultos",
      currency: "Real brasileiro (R$)",
    },
    cover: { tagline: "" },
    itinerary: [
      { id: "1", date: "2026-12-10", portOrDestination: "Santos", operation: "Embarque", arrival: "", departure: "18:00" },
      { id: "2", date: "2026-12-11", portOrDestination: "Navegação", operation: "Navegação", arrival: "", departure: "" },
      { id: "3", date: "2026-12-12", portOrDestination: "Ilhabela", operation: "Ancorado", arrival: "08:00", departure: "18:00" },
    ],
    ship: { photos: [], highlights: "" },
    fare: {
      cabins: [{ id: "1", category: "Varanda", type: "Garantida (GTY)", occupancy: "", price: "R$ 4.500,00", photo: null }],
      portFeesOption: "included",
      portFeesValue: "",
      fareRules: "",
    },
    paymentTerms: "general",
    inclusions: {
      included: ["Pensão completa", "Entretenimento a bordo"],
      notIncluded: ["Bebidas alcoólicas"],
      optional: ["Pacote de bebidas", "Wi-Fi"],
      importantInfo: "",
    },
    agencyLogo: null,
    itineraryImage: null,
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
      coverTagline: "Um mergulho na costa brasileira.",
      tripSummary: "Sete dias a bordo do MSC Seaside, saindo de Santos.",
      shipProfile: { shipClass: "Seaside", capacity: "Cerca de 4.200 passageiros", highlights: ["Deck aquático", "Teatro"] },
      onboardExperience: "Entretenimento, gastronomia variada e espaço infantil.",
      ports: [
        { name: "Santos", shortDescription: "Porto de embarque.", photo: { status: "not_found", url: null, sourceUrl: null, caption: null } },
        { name: "Ilhabela", shortDescription: "Ilha litorânea com trilhas.", photo: { status: "not_found", url: null, sourceUrl: null, caption: null } },
      ],
      shipPhoto: { status: "not_found", url: null, sourceUrl: null, caption: null },
      ...aiOverrides,
    },
  } as CruiseQuoteRecord;
}

const supabase = {
  storage: { from: vi.fn().mockReturnValue({ download: vi.fn() }) },
  from: vi.fn().mockReturnValue({
    select: vi.fn().mockReturnValue({ maybeSingle: vi.fn().mockResolvedValue({ data: null }) }),
  }),
} as never;

describe("buildCruisePresentation", () => {
  beforeEach(() => {
    vi.mocked(fetch).mockReset();
  });

  it("lança erro se o status não for 'done'", async () => {
    const quote = { ...makeQuote(), status: "processing" } as CruiseQuoteRecord;
    await expect(buildCruisePresentation(supabase, quote)).rejects.toThrow("sem geração concluída");
  });

  it("lança erro se aiOutput for nulo", async () => {
    const quote = { ...makeQuote(), aiOutput: null } as unknown as CruiseQuoteRecord;
    await expect(buildCruisePresentation(supabase, quote)).rejects.toThrow("sem geração concluída");
  });

  it("gera um Buffer .pptx válido com a estrutura OOXML esperada", async () => {
    const buffer = await buildCruisePresentation(supabase, makeQuote());

    expect(buffer).toBeInstanceOf(Buffer);
    expect(buffer.byteLength).toBeGreaterThan(0);

    const zip = await JSZip.loadAsync(buffer);
    expect(zip.file("ppt/presentation.xml")).not.toBeNull();
  });

  it("contagem de slides: capa + resumo + roteiro + portos + navio + a bordo + cabines + incluído + final = 9", async () => {
    const buffer = await buildCruisePresentation(supabase, makeQuote());
    const zip = await JSZip.loadAsync(buffer);
    const slideFiles = Object.keys(zip.files).filter((name) => /^ppt\/slides\/slide\d+\.xml$/.test(name));
    expect(slideFiles).toHaveLength(9);
  });

  it("sem roteiro informado: omite o slide de portos (sem dados da IA para nenhum porto)", async () => {
    const buffer = await buildCruisePresentation(
      supabase,
      makeQuote({ itinerary: [] }, {}),
    );
    const zip = await JSZip.loadAsync(buffer);
    const slideFiles = Object.keys(zip.files).filter((name) => /^ppt\/slides\/slide\d+\.xml$/.test(name));
    // capa + resumo + roteiro (vazio, omitido) + portos (vazio, omitido) + navio + a bordo + cabines + incluído + final = 7
    expect(slideFiles).toHaveLength(7);
  });

  it("sem itens em incluído/não incluído/opcionais: omite o slide 'O que está incluído'", async () => {
    const buffer = await buildCruisePresentation(
      supabase,
      makeQuote({ inclusions: { included: [], notIncluded: [], optional: [], importantInfo: "" } }),
    );
    const zip = await JSZip.loadAsync(buffer);
    const slideFiles = Object.keys(zip.files).filter((name) => /^ppt\/slides\/slide\d+\.xml$/.test(name));
    // base de 9 menos o slide "O que está incluído" (omitido) = 8
    expect(slideFiles).toHaveLength(8);
  });

  it("mais de 3 cabines: pagina em slide de continuação", async () => {
    const manyCabins = Array.from({ length: 4 }, (_, index) => ({
      id: String(index + 1),
      category: `Categoria ${index + 1}`,
      type: "Garantida (GTY)" as const,
      occupancy: "",
      price: "R$ 4.500,00",
      photo: null,
    }));
    const buffer = await buildCruisePresentation(
      supabase,
      makeQuote({ fare: { cabins: manyCabins, portFeesOption: "included", portFeesValue: "", fareRules: "" } }),
    );
    const zip = await JSZip.loadAsync(buffer);
    const slideFiles = Object.keys(zip.files).filter((name) => /^ppt\/slides\/slide\d+\.xml$/.test(name));
    // 1 slide extra de cabines (4 cabines / 3 por slide = 2 páginas) em relação à base de 9
    expect(slideFiles).toHaveLength(10);
  });

  it("mais de 15 itens incluídos: pagina em slide de continuação, sem omitir itens", async () => {
    const manyIncluded = Array.from({ length: 16 }, (_, index) => `Item incluído ${index + 1}`);
    const buffer = await buildCruisePresentation(
      supabase,
      makeQuote({
        inclusions: { included: manyIncluded, notIncluded: [], optional: [], importantInfo: "" },
      }),
    );
    const zip = await JSZip.loadAsync(buffer);
    const slideFiles = Object.keys(zip.files).filter((name) => /^ppt\/slides\/slide\d+\.xml$/.test(name));
    // 1 slide extra do bloco "O que está incluído" (16 itens / 15 por página = 2 páginas) em relação à base de 9
    expect(slideFiles).toHaveLength(10);

    const lastInclusionsSlide = await zip.file("ppt/slides/slide9.xml")!.async("text");
    expect(lastInclusionsSlide).toContain("Item incluído 16");
  });
});
