import type { QuoteDraftValues, QuoteFormValues } from "@/features/quotes/schemas/quote-form.schema";
import { normalizeQuoteDraft, quoteFormDefaultValues } from "@/features/quotes/schemas/quote-form.schema";
import { toQuoteSummary, type QuoteRecord } from "@/features/quotes/schemas/quote.schema";
import type {
  QuoteListFilters,
  QuoteListResult,
  QuoteRepository,
} from "@/features/quotes/repository/types";

/** Latência simulada das operações, para aproximar o comportamento de uma API real. */
const SIMULATED_LATENCY_MS = 350;

function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function createId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `id-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function buildForm(overrides: Partial<QuoteFormValues["general"]>): QuoteFormValues {
  return {
    ...quoteFormDefaultValues,
    general: { ...quoteFormDefaultValues.general, ...overrides },
    inclusions: [
      { id: createId(), text: "Traslado aeroporto/hotel/aeroporto" },
      { id: createId(), text: "Café da manhã incluso" },
    ],
    hotels: [
      {
        id: createId(),
        name: "Hotel exemplo",
        mealPlan: "Café da manhã",
        rooms: [{ id: createId(), text: "Duplo Standard | R$ 8.500,00" }],
      },
    ],
  };
}

function seedQuotes(): QuoteRecord[] {
  const now = Date.now();
  const daysAgo = (days: number) => new Date(now - days * 86_400_000).toISOString();

  return [
    {
      id: createId(),
      status: "done",
      createdAt: daysAgo(10),
      updatedAt: daysAgo(9),
      createdBy: "consultor@snow.com.br",
      form: buildForm({
        agency: "Primus Turismo",
        consultant: "Maria Silva",
        destination: "Buenos Aires, Argentina",
        startDate: "2026-07-20",
        endDate: "2026-07-27",
      }),
    },
    {
      id: createId(),
      status: "processing",
      createdAt: daysAgo(2),
      updatedAt: daysAgo(0),
      createdBy: "consultor@snow.com.br",
      form: buildForm({
        agency: "Viaje Mais Turismo",
        consultant: "João Pereira",
        destination: "Santiago, Chile",
        startDate: "2026-09-05",
        endDate: "2026-09-12",
      }),
    },
    {
      id: createId(),
      status: "draft",
      createdAt: daysAgo(1),
      updatedAt: daysAgo(1),
      createdBy: "consultor@snow.com.br",
      form: buildForm({
        agency: "Destino Certo Viagens",
        consultant: "Ana Costa",
        destination: "Bariloche, Argentina",
        startDate: "2026-12-15",
        endDate: "2026-12-22",
      }),
    },
    {
      id: createId(),
      status: "error",
      createdAt: daysAgo(5),
      updatedAt: daysAgo(5),
      createdBy: "consultor@snow.com.br",
      errorMessage: "Falha ao interpretar a imagem de voo. Tente novamente.",
      form: buildForm({
        agency: "Mundo Aberto Turismo",
        consultant: "Carlos Souza",
        destination: "Punta Cana, República Dominicana",
        startDate: "2026-08-01",
        endDate: "2026-08-08",
      }),
    },
  ];
}

/**
 * Implementação mock de `QuoteRepository`, com dados em memória e latência
 * simulada. Usada até o M5; será substituída por uma implementação Supabase
 * com a mesma interface (ver `features/quotes/repository/types.ts`).
 */
export class InMemoryQuoteRepository implements QuoteRepository {
  private quotes: QuoteRecord[];

  constructor(initialQuotes: QuoteRecord[] = seedQuotes()) {
    this.quotes = initialQuotes;
  }

  async list(filters: QuoteListFilters = {}): Promise<QuoteListResult> {
    await wait(SIMULATED_LATENCY_MS);

    let items = [...this.quotes];

    if (filters.status) {
      items = items.filter((quote) => quote.status === filters.status);
    }

    if (filters.destination) {
      const term = filters.destination.trim().toLowerCase();
      items = items.filter((quote) => quote.form.general.destination.toLowerCase().includes(term));
    }

    if (filters.periodStart) {
      items = items.filter((quote) => quote.form.general.startDate >= filters.periodStart!);
    }

    if (filters.periodEnd) {
      items = items.filter((quote) => quote.form.general.endDate <= filters.periodEnd!);
    }

    if (filters.search) {
      const term = filters.search.trim().toLowerCase();
      items = items.filter((quote) => {
        const haystack =
          `${quote.form.general.agency} ${quote.form.general.consultant} ${quote.form.general.destination}`.toLowerCase();
        return haystack.includes(term);
      });
    }

    items.sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : -1));

    return { items: items.map(toQuoteSummary), total: items.length };
  }

  async getById(id: string): Promise<QuoteRecord | null> {
    await wait(SIMULATED_LATENCY_MS);
    return this.quotes.find((quote) => quote.id === id) ?? null;
  }

  async create(form: QuoteDraftValues, createdBy: string): Promise<QuoteRecord> {
    await wait(SIMULATED_LATENCY_MS);
    const now = new Date().toISOString();
    const record: QuoteRecord = {
      id: createId(),
      status: "draft",
      createdAt: now,
      updatedAt: now,
      createdBy,
      form: normalizeQuoteDraft(form),
    };
    this.quotes = [record, ...this.quotes];
    return record;
  }

  async update(id: string, form: QuoteDraftValues): Promise<QuoteRecord> {
    await wait(SIMULATED_LATENCY_MS);
    const existing = this.quotes.find((quote) => quote.id === id);
    if (!existing) {
      throw new Error(`Orçamento ${id} não encontrado.`);
    }
    const updated: QuoteRecord = {
      ...existing,
      form: normalizeQuoteDraft(form),
      updatedAt: new Date().toISOString(),
    };
    this.quotes = this.quotes.map((quote) => (quote.id === id ? updated : quote));
    return updated;
  }

  async duplicate(id: string): Promise<QuoteRecord> {
    await wait(SIMULATED_LATENCY_MS);
    const existing = this.quotes.find((quote) => quote.id === id);
    if (!existing) {
      throw new Error(`Orçamento ${id} não encontrado.`);
    }
    const now = new Date().toISOString();
    const copy: QuoteRecord = {
      ...existing,
      id: createId(),
      status: "draft",
      createdAt: now,
      updatedAt: now,
      errorMessage: undefined,
    };
    this.quotes = [copy, ...this.quotes];
    return copy;
  }

  async remove(id: string): Promise<void> {
    await wait(SIMULATED_LATENCY_MS);
    this.quotes = this.quotes.filter((quote) => quote.id !== id);
  }

  async regenerate(id: string): Promise<QuoteRecord> {
    const existing = this.quotes.find((quote) => quote.id === id);
    if (!existing) {
      throw new Error(`Orçamento ${id} não encontrado.`);
    }

    const processing: QuoteRecord = {
      ...existing,
      status: "processing",
      errorMessage: undefined,
      updatedAt: new Date().toISOString(),
    };
    this.quotes = this.quotes.map((quote) => (quote.id === id ? processing : quote));

    await wait(SIMULATED_LATENCY_MS * 2);

    // Simula uma falha ocasional para exercitar o estado de erro na UI.
    const didFail = Math.random() < 0.15;
    const finished: QuoteRecord = {
      ...processing,
      status: didFail ? "error" : "done",
      errorMessage: didFail ? "Não foi possível gerar o orçamento. Tente novamente." : undefined,
      updatedAt: new Date().toISOString(),
    };
    this.quotes = this.quotes.map((quote) => (quote.id === id ? finished : quote));
    return finished;
  }
}
