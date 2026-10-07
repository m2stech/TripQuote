"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";
import { getQuoteRepository } from "@/features/quotes/repository";
import type { QuoteListFilters } from "@/features/quotes/repository/types";
import { quoteDraftSchema, type QuoteDraftInput } from "@/features/quotes/schemas/quote-form.schema";
import type { QuoteRecord } from "@/features/quotes/schemas/quote.schema";

/** Fronteira Zod: nunca confiar em dados vindos do client sem validar aqui. */
async function requireCurrentUserId(): Promise<string> {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) {
    throw new Error("Sessão expirada. Faça login novamente.");
  }
  return data.user.id;
}

export async function listQuotesAction(filters: QuoteListFilters = {}) {
  const repository = await getQuoteRepository();
  return repository.list(filters);
}

export async function getQuoteAction(id: string): Promise<QuoteRecord | null> {
  const repository = await getQuoteRepository();
  return repository.getById(id);
}

export async function createQuoteAction(form: QuoteDraftInput): Promise<QuoteRecord> {
  const parsed = quoteDraftSchema.parse(form);
  const userId = await requireCurrentUserId();
  const repository = await getQuoteRepository();
  const record = await repository.create(parsed, userId);
  revalidatePath("/orcamentos");
  return record;
}

/**
 * Salva o rascunho em edição, criando a linha em `quotes` no primeiro save
 * (autosave ou upload de anexo) e atualizando nas chamadas seguintes —
 * idempotente por `id` (gerado no client, sem bater no banco, ao abrir o
 * formulário). Propositalmente **não** há criação no mount da tela: visitar
 * "/orcamentos/novo" sem preencher nada não deve gravar nenhuma linha.
 */
export async function updateQuoteAction(id: string, form: QuoteDraftInput): Promise<QuoteRecord> {
  const parsed = quoteDraftSchema.parse(form);
  const userId = await requireCurrentUserId();
  const repository = await getQuoteRepository();
  const record = await repository.upsertDraft(id, parsed, userId);
  revalidatePath("/orcamentos");
  revalidatePath(`/orcamentos/${id}`);
  return record;
}

export async function duplicateQuoteAction(id: string): Promise<QuoteRecord> {
  const repository = await getQuoteRepository();
  const record = await repository.duplicate(id);
  revalidatePath("/orcamentos");
  return record;
}

export async function removeQuoteAction(id: string): Promise<void> {
  const repository = await getQuoteRepository();
  await repository.remove(id);
  revalidatePath("/orcamentos");
}

export async function regenerateQuoteAction(id: string): Promise<QuoteRecord> {
  const repository = await getQuoteRepository();
  const record = await repository.regenerate(id);
  revalidatePath(`/orcamentos/${id}`);
  return record;
}
