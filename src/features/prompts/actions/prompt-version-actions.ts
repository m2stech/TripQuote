"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdmin } from "@/lib/auth/require-admin";
import { listPromptVersions } from "@/features/prompts/repository/prompt-version-repository";
import {
  createPromptVersionInputSchema,
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

export async function listPromptVersionsAction(): Promise<PromptVersionRecord[]> {
  await requireAdmin();
  const supabase = await createClient();
  return listPromptVersions(supabase);
}

/**
 * Cria uma nova versão do prompt e, opcionalmente, já a ativa. A constraint
 * `prompt_versions_single_active` (migration M4) garante uma única versão
 * ativa por vez — por isso a versão anterior é desativada antes de inserir
 * a nova como ativa, numa ordem que nunca deixa duas linhas ativas ao
 * mesmo tempo nem o banco sem nenhuma ativa entre as duas operações.
 */
export async function createPromptVersionAction(input: unknown): Promise<void> {
  const actorId = await requireAdmin();
  const parsed = createPromptVersionInputSchema.parse(input);

  const supabase = await createClient();

  const { data: latest, error: latestError } = await supabase
    .from("prompt_versions")
    .select("version")
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
      .eq("is_active", true);
    if (deactivateError) {
      throw new Error(`Não foi possível desativar a versão atual: ${deactivateError.message}`);
    }
  }

  const { data: inserted, error: insertError } = await supabase
    .from("prompt_versions")
    .insert({
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

/** Ativa uma versão existente, desativando a que estiver ativa no momento. */
export async function activatePromptVersionAction(promptVersionId: string): Promise<void> {
  const actorId = await requireAdmin();

  const supabase = await createClient();

  const { error: deactivateError } = await supabase
    .from("prompt_versions")
    .update({ is_active: false })
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
