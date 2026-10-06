import { beforeEach, describe, expect, it } from "vitest";

import { SupabaseQuoteRepository } from "@/features/quotes/repository/supabase-quote-repository";
import {
  quoteDraftSchema,
  quoteFormDefaultValues,
  type QuoteDraftInput,
} from "@/features/quotes/schemas/quote-form.schema";

/** Simula o que `quoteDraftSchema.parse()` já produz nas Server Actions. */
function draft(input: QuoteDraftInput = {}) {
  return quoteDraftSchema.parse(input);
}

/**
 * Fake mínimo do client Supabase, cobrindo apenas a superfície usada por
 * `SupabaseQuoteRepository` (`from().select/insert/update/delete` + storage).
 * Guarda os dados em memória para simular o comportamento do Postgres.
 */
function createFakeSupabase() {
  interface Row {
    id: string;
    status: "draft" | "processing" | "done" | "error";
    created_by: string;
    agency: string;
    consultant: string;
    destination: string;
    start_date: string | null;
    end_date: string | null;
    form: unknown;
    error_message: string | null;
    created_at: string;
    updated_at: string;
  }

  let nextId = 1;
  const rows: Row[] = [];
  const attachments: Array<{
    id: string;
    quote_id: string;
    kind: string;
    storage_path: string;
    file_name: string;
    mime_type: string;
    size_bytes: number;
  }> = [];

  function quotesTable() {
    let filtered = [...rows];
    let pendingInsert: Partial<Row> | null = null;
    let pendingUpdate: Partial<Row> | null = null;
    let pendingUpdateMatchId: string | null = null;

    const builder = {
      select() {
        return builder;
      },
      eq(column: keyof Row, value: unknown) {
        if (pendingUpdate) {
          pendingUpdateMatchId = value as string;
          return builder;
        }
        filtered = filtered.filter((row) => row[column] === value);
        return builder;
      },
      ilike(column: keyof Row, pattern: string) {
        const term = pattern.replace(/%/g, "").toLowerCase();
        filtered = filtered.filter((row) => String(row[column]).toLowerCase().includes(term));
        return builder;
      },
      gte(column: keyof Row, value: string) {
        filtered = filtered.filter((row) => (row[column] as string) >= value);
        return builder;
      },
      lte(column: keyof Row, value: string) {
        filtered = filtered.filter((row) => (row[column] as string) <= value);
        return builder;
      },
      or(expression: string) {
        const term = expression.match(/ilike\.%([^%]*)%/)?.[1]?.toLowerCase() ?? "";
        filtered = filtered.filter(
          (row) =>
            row.agency.toLowerCase().includes(term) ||
            row.consultant.toLowerCase().includes(term) ||
            row.destination.toLowerCase().includes(term),
        );
        return builder;
      },
      order() {
        filtered = [...filtered].sort((a, b) => (a.updated_at < b.updated_at ? 1 : -1));
        return builder;
      },
      insert(values: Partial<Row>) {
        pendingInsert = values;
        return builder;
      },
      update(values: Partial<Row>) {
        pendingUpdate = values;
        return builder;
      },
      delete() {
        return {
          eq(_column: "id", value: string) {
            const index = rows.findIndex((row) => row.id === value);
            if (index >= 0) rows.splice(index, 1);
            return Promise.resolve({ error: null });
          },
        };
      },
      maybeSingle() {
        const [row] = filtered;
        return Promise.resolve({ data: row ?? null, error: null });
      },
      single() {
        if (pendingInsert) {
          const now = new Date().toISOString();
          const row: Row = {
            id: `quote-${nextId++}`,
            status: "draft",
            created_by: "",
            agency: "",
            consultant: "",
            destination: "",
            start_date: null,
            end_date: null,
            form: {},
            error_message: null,
            created_at: now,
            updated_at: now,
            ...pendingInsert,
          };
          rows.push(row);
          return Promise.resolve({ data: row, error: null });
        }
        if (pendingUpdate) {
          const row = rows.find((candidate) => candidate.id === pendingUpdateMatchId);
          if (!row) return Promise.resolve({ data: null, error: { message: "not found" } });
          Object.assign(row, pendingUpdate, { updated_at: new Date().toISOString() });
          return Promise.resolve({ data: row, error: null });
        }
        return Promise.resolve({ data: null, error: { message: "unsupported" } });
      },
      then(resolve: (value: { data: Row[]; error: null; count: number }) => void) {
        resolve({ data: filtered, error: null, count: filtered.length });
      },
    };

    return builder;
  }

  function attachmentsTable() {
    let filtered = [...attachments];
    const builder = {
      select() {
        return builder;
      },
      eq(_column: "quote_id", value: string) {
        filtered = filtered.filter((attachment) => attachment.quote_id === value);
        return Promise.resolve({ data: filtered, error: null });
      },
      insert(values: (typeof attachments)[number]) {
        attachments.push(values);
        return Promise.resolve({ error: null });
      },
    };
    return builder;
  }

  return {
    rows,
    attachments,
    from(table: "quotes" | "quote_attachments") {
      return table === "quotes" ? quotesTable() : attachmentsTable();
    },
    storage: {
      from() {
        return {
          copy() {
            return Promise.resolve({ data: {}, error: null });
          },
          remove() {
            return Promise.resolve({ data: {}, error: null });
          },
        };
      },
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- fake mínimo só para os testes
  } as any;
}

describe("SupabaseQuoteRepository", () => {
  let supabase: ReturnType<typeof createFakeSupabase>;
  let repository: SupabaseQuoteRepository;

  beforeEach(() => {
    supabase = createFakeSupabase();
    repository = new SupabaseQuoteRepository(supabase);
  });

  it("cria um orçamento com status 'draft' e form normalizado", async () => {
    const created = await repository.create(draft({ general: { agency: "Primus Turismo" } }), "user-1");
    expect(created.status).toBe("draft");
    expect(created.form.general.agency).toBe("Primus Turismo");
    expect(created.form.general.destination).toBe("");
  });

  it("atualiza um orçamento existente", async () => {
    const created = await repository.create(draft(), "user-1");
    const updated = await repository.update(
      created.id,
      draft({ general: { agency: "Nova Agência", destination: "Lisboa" } }),
    );
    expect(updated.form.general.agency).toBe("Nova Agência");
    expect(updated.form.general.destination).toBe("Lisboa");
  });

  it("lista orçamentos filtrando por destino", async () => {
    await repository.create(draft({ general: { destination: "Lisboa" } }), "user-1");
    await repository.create(draft({ general: { destination: "Porto" } }), "user-1");

    const result = await repository.list({ destination: "Lisboa" });
    expect(result.items).toHaveLength(1);
    expect(result.items[0]?.destination).toBe("Lisboa");
  });

  it("duplica um orçamento com novo id e status 'draft'", async () => {
    const original = await repository.create(
      draft({ general: { agency: "Primus Turismo", destination: "Santiago" } }),
      "user-1",
    );
    const copy = await repository.duplicate(original.id);

    expect(copy.id).not.toBe(original.id);
    expect(copy.status).toBe("draft");
    expect(copy.form.general.agency).toBe("Primus Turismo");
  });

  it("remove um orçamento", async () => {
    const created = await repository.create(draft(), "user-1");
    await repository.remove(created.id);
    const found = await repository.getById(created.id);
    expect(found).toBeNull();
  });

  it("regenerate() transiciona para 'done' ou 'error'", async () => {
    const created = await repository.create(
      draft({ general: { agency: "Primus Turismo" } }),
      "user-1",
    );
    const result = await repository.regenerate(created.id);
    expect(["done", "error"]).toContain(result.status);
  });

  it("normaliza o form ao ler (compatibilidade com `quoteFormDefaultValues`)", async () => {
    const created = await repository.create(draft(), "user-1");
    expect(created.form).toEqual(quoteFormDefaultValues);
  });
});
