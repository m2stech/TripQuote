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

/**
 * Cria (ou retorna) o rascunho do formulário em edição. Usada no mount da
 * tela de novo orçamento para obter um `quoteId` real antes de qualquer
 * upload de anexo (o path no Storage depende do orçamento já existir).
 */
export async function ensureDraftQuoteAction(existingId?: string): Promise<QuoteRecord> {
  const repository = await getQuoteRepository();

  if (existingId) {
    const existing = await repository.getById(existingId);
    if (existing) return existing;
  }

  const userId = await requireCurrentUserId();
  const parsed = quoteDraftSchema.parse({});
  return repository.create(parsed, userId);
}

export async function createQuoteAction(form: QuoteDraftInput): Promise<QuoteRecord> {
  const parsed = quoteDraftSchema.parse(form);
  const userId = await requireCurrentUserId();
  const repository = await getQuoteRepository();
  const record = await repository.create(parsed, userId);
  revalidatePath("/orcamentos");
  return record;
}

export async function updateQuoteAction(id: string, form: QuoteDraftInput): Promise<QuoteRecord> {
  const parsed = quoteDraftSchema.parse(form);
  const repository = await getQuoteRepository();
  const record = await repository.update(id, parsed);
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
