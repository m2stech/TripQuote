"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdmin } from "@/lib/auth/require-admin";
import { listPromptVersions } from "@/features/prompts/repository/prompt-version-repository";
import {
  createPromptVersionInputSchema,
  type ProductType,
  type PromptVersionRecord,
} from "@/features/prompts/schemas/prompt-version.schema";

async function logAudit(actorId: string, action: string, entityId: string) {
  const adminSupabase = createAdminClient();
  await adminSupabase.from("audit_log").insert({
    actor_id: actorId,
    action,
    entity_type: "prompt_version",
    entity_id: entityId,
  });
}

export async function listPromptVersionsAction(
  productType: ProductType,
): Promise<PromptVersionRecord[]> {
  await requireAdmin();
  const supabase = await createClient();
  return listPromptVersions(supabase, productType);
}

/**
 * Cria uma nova versão do prompt (de um tipo de produto) e, opcionalmente,
 * já a ativa. A constraint `prompt_versions_single_active` (migration M11)
 * garante uma única versão ativa por tipo de produto — por isso a versão
 * anterior desse mesmo tipo é desativada antes de inserir a nova como ativa,
 * numa ordem que nunca deixa duas linhas ativas ao mesmo tempo nem o banco
 * sem nenhuma ativa (desse tipo) entre as duas operações.
 */
export async function createPromptVersionAction(input: unknown): Promise<void> {
  const actorId = await requireAdmin();
  const parsed = createPromptVersionInputSchema.parse(input);

  const supabase = await createClient();

  const { data: latest, error: latestError } = await supabase
    .from("prompt_versions")
    .select("version")
    .eq("product_type", parsed.productType)
    .order("version", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (latestError) {
    throw new Error(`Não foi possível determinar a próxima versão: ${latestError.message}`);
  }
  const nextVersion = (latest?.version ?? 0) + 1;

  if (parsed.activate) {
    const { error: deactivateError } = await supabase
      .from("prompt_versions")
      .update({ is_active: false })
      .eq("product_type", parsed.productType)
      .eq("is_active", true);
    if (deactivateError) {
      throw new Error(`Não foi possível desativar a versão atual: ${deactivateError.message}`);
    }
  }

  const { data: inserted, error: insertError } = await supabase
    .from("prompt_versions")
    .insert({
      product_type: parsed.productType,
      version: nextVersion,
      content: parsed.content,
      is_active: parsed.activate,
      created_by: actorId,
    })
    .select("id")
    .single();
  if (insertError || !inserted) {
    throw new Error(`Não foi possível criar a versão: ${insertError?.message ?? "erro desconhecido"}`);
  }

  await logAudit(actorId, parsed.activate ? "prompt.created_and_activated" : "prompt.created", inserted.id);
  revalidatePath("/admin/prompts");
}

/** Ativa uma versão existente, desativando a que estiver ativa no momento (mesmo tipo de produto). */
export async function activatePromptVersionAction(
  promptVersionId: string,
  productType: ProductType,
): Promise<void> {
  const actorId = await requireAdmin();

  const supabase = await createClient();

  const { error: deactivateError } = await supabase
    .from("prompt_versions")
    .update({ is_active: false })
    .eq("product_type", productType)
    .eq("is_active", true);
  if (deactivateError) {
    throw new Error(`Não foi possível desativar a versão atual: ${deactivateError.message}`);
  }

  const { error: activateError } = await supabase
    .from("prompt_versions")
    .update({ is_active: true })
    .eq("id", promptVersionId);
  if (activateError) {
    throw new Error(`Não foi possível ativar a versão: ${activateError.message}`);
  }

  await logAudit(actorId, "prompt.activated", promptVersionId);
  revalidatePath("/admin/prompts");
}
