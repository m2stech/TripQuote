"use server";

import { revalidatePath } from "next/cache";

import { requireCurrentUserId } from "@/lib/auth/require-current-user-id";
import { getQuoteRepository } from "@/features/quotes/repository";
import { runQuoteGeneration } from "@/features/quotes/actions/generation-orchestrator";
import type { QuoteListFilters } from "@/features/quotes/repository/types";
import { quoteDraftSchema, type QuoteDraftInput } from "@/features/quotes/schemas/quote-form.schema";
import type { QuoteRecord } from "@/features/quotes/schemas/quote.schema";

/**
 * `onlyMine` é resolvido aqui com o usuário autenticado no servidor — nunca
 * recebido como id direto do client — para que o filtro "apenas as minhas"
 * do admin não possa ser usado para espiar os orçamentos de outro usuário.
 * Para consultor, a restrição por usuário já vem da RLS independente deste
 * parâmetro.
 */
export async function listQuotesAction(
  filters: Omit<QuoteListFilters, "createdBy"> & { onlyMine?: boolean } = {},
) {
  const { onlyMine, ...rest } = filters;
  const repository = await getQuoteRepository();

  if (onlyMine) {
    const userId = await requireCurrentUserId();
    return repository.list({ ...rest, createdBy: userId });
  }

  return repository.list(rest);
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
  const userId = await requireCurrentUserId();
  const record = await runQuoteGeneration(id, userId);
  revalidatePath(`/orcamentos/${id}`);
  return record;
}
