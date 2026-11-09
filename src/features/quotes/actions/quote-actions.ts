"use server";

import { revalidatePath } from "next/cache";

import { getCurrentUserRole } from "@/lib/auth/get-current-user-role";
import { requireCurrentUserId } from "@/lib/auth/require-current-user-id";
import { getQuoteRepository } from "@/features/quotes/repository";
import { runQuoteGeneration } from "@/features/quotes/actions/generation-orchestrator";
import type { QuoteListFilters } from "@/features/quotes/repository/types";
import { updateCommercialStatusInputSchema } from "@/features/quotes/schemas/commercial-status.schema";
import {
  anyQuoteDraftSchema,
  type AnyQuoteDraftValues,
} from "@/features/quotes/schemas/product.schema";
import type { QuoteRecord } from "@/features/quotes/schemas/quote.schema";
import type { Database } from "@/lib/supabase/types";

/** Entrada aceita pelas actions, antes da validação Zod (une os dois tipos de produto). */
export type QuoteDraftActionInput = AnyQuoteDraftValues;

/**
 * Papel do usuário autenticado, resolvido client-side (ver `QuoteListScreen`)
 * em vez de no Server Component da página — chamar `getCurrentUserRole`
 * (acesso dinâmico: cookies + consulta ao Supabase) direto em `page.tsx`,
 * mesmo dentro de `<Suspense>`, já causou "Next.js encountered the unstable
 * value `Date.now()` while prerendering" sob Cache Components (Next 16).
 * Mesmo padrão de `UserManagementScreen`, que também resolve tudo no client.
 */
export async function getCurrentUserRoleAction(): Promise<
  Database["public"]["Enums"]["user_role"]
> {
  return getCurrentUserRole();
}

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

export async function createQuoteAction(form: QuoteDraftActionInput): Promise<QuoteRecord> {
  const parsed = anyQuoteDraftSchema.parse(form);
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
export async function updateQuoteAction(
  id: string,
  form: QuoteDraftActionInput,
): Promise<QuoteRecord> {
  const parsed = anyQuoteDraftSchema.parse(form);
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

/**
 * Altera o status comercial de um orçamento (M12). Quem pode: o consultor
 * dono do orçamento ou admin — mesma regra owner-or-admin já aplicada pela
 * RLS de `quotes`, replicada aqui porque a UPDATE em si é permitida pela
 * policy existente (sem policy nova para as colunas comerciais), então a
 * checagem de autorização específica dessa ação precisa viver na Server
 * Action.
 */
export async function updateQuoteCommercialStatusAction(
  id: string,
  input: unknown,
): Promise<QuoteRecord> {
  const parsed = updateCommercialStatusInputSchema.parse(input);
  const userId = await requireCurrentUserId();
  const repository = await getQuoteRepository();

  const existing = await repository.getById(id);
  if (!existing) throw new Error("Orçamento não encontrado.");

  if (existing.createdBy !== userId) {
    const role = await getCurrentUserRole();
    if (role !== "admin") {
      throw new Error("Você não tem permissão para alterar este orçamento.");
    }
  }

  const record = await repository.updateCommercialStatus(id, parsed, userId);
  revalidatePath("/orcamentos");
  revalidatePath(`/orcamentos/${id}`);
  return record;
}
