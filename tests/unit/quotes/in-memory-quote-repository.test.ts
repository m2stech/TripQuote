import { describe, expect, it } from "vitest";

import { InMemoryQuoteRepository } from "@/features/quotes/repository/in-memory-quote-repository";
import { quoteFormDefaultValues } from "@/features/quotes/schemas/quote-form.schema";

function makeForm(overrides: Partial<typeof quoteFormDefaultValues.general> = {}) {
  return {
    ...quoteFormDefaultValues,
    general: { ...quoteFormDefaultValues.general, ...overrides },
    inclusions: [{ id: "inc-1", text: "Traslado" }],
    hotels: [
      {
        id: "hotel-1",
        name: "Hotel teste",
        mealPlan: "Café da manhã" as const,
        rooms: [{ id: "room-1", text: "Duplo | R$ 1.000,00" }],
      },
    ],
  };
}

describe("InMemoryQuoteRepository", () => {
  it("lista os orçamentos seedados por padrão", async () => {
    const repository = new InMemoryQuoteRepository();
    const result = await repository.list();
    expect(result.total).toBeGreaterThan(0);
    expect(result.items.length).toBe(result.total);
  });

  it("filtra por status", async () => {
    const repository = new InMemoryQuoteRepository();
    const result = await repository.list({ status: "draft" });
    expect(result.items.every((item) => item.status === "draft")).toBe(true);
  });

  it("filtra por busca textual (agência, consultor ou destino)", async () => {
    const repository = new InMemoryQuoteRepository([]);
    await repository.create(makeForm({ agency: "Agência Alfa", destination: "Lisboa" }), "user@test.com");
    await repository.create(makeForm({ agency: "Agência Beta", destination: "Porto" }), "user@test.com");

    const result = await repository.list({ search: "Lisboa" });
    expect(result.items).toHaveLength(1);
    expect(result.items[0]?.destination).toBe("Lisboa");
  });

  it("cria um orçamento com status inicial 'draft'", async () => {
    const repository = new InMemoryQuoteRepository([]);
    const created = await repository.create(makeForm(), "user@test.com");
    expect(created.status).toBe("draft");
    expect(created.id).toBeTruthy();
  });

  it("duplica um orçamento existente com novo id e status 'draft'", async () => {
    const repository = new InMemoryQuoteRepository([]);
    const original = await repository.create(makeForm(), "user@test.com");
    const copy = await repository.duplicate(original.id);

    expect(copy.id).not.toBe(original.id);
    expect(copy.status).toBe("draft");
    expect(copy.form.general.agency).toBe(original.form.general.agency);
  });

  it("remove um orçamento", async () => {
    const repository = new InMemoryQuoteRepository([]);
    const created = await repository.create(makeForm(), "user@test.com");
    await repository.remove(created.id);
    const found = await repository.getById(created.id);
    expect(found).toBeNull();
  });

  it("regenerate() transiciona para 'done' ou 'error', nunca permanece em 'processing'", async () => {
    const repository = new InMemoryQuoteRepository([]);
    const created = await repository.create(makeForm(), "user@test.com");
    const result = await repository.regenerate(created.id);
    expect(["done", "error"]).toContain(result.status);
  });

  it("rejeita operações sobre orçamento inexistente", async () => {
    const repository = new InMemoryQuoteRepository([]);
    await expect(repository.update("inexistente", makeForm())).rejects.toThrow();
    await expect(repository.duplicate("inexistente")).rejects.toThrow();
    await expect(repository.regenerate("inexistente")).rejects.toThrow();
  });
});
