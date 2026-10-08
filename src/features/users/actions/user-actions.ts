"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdmin } from "@/lib/auth/require-admin";
import { listUsers } from "@/features/users/repository/user-repository";
import {
  inviteUserInputSchema,
  setUserActiveInputSchema,
  updateUserRoleInputSchema,
  type UserRecord,
} from "@/features/users/schemas/user.schema";
import type { Json } from "@/lib/supabase/types";

async function logAudit(
  actorId: string,
  action: string,
  entityId: string,
  metadata: Json = {},
) {
  const adminSupabase = createAdminClient();
  await adminSupabase.from("audit_log").insert({
    actor_id: actorId,
    action,
    entity_type: "user",
    entity_id: entityId,
    metadata,
  });
}

export async function listUsersAction(): Promise<UserRecord[]> {
  await requireAdmin();
  const supabase = await createClient();
  return listUsers(supabase);
}

/**
 * Convida um novo usuário por e-mail via Supabase Auth Admin API (envia o
 * e-mail de convite nativo do Supabase). O trigger `handle_new_user` cria a
 * linha em `profiles` só com `id`/`email`; aqui completamos nome e papel.
 *
 * O link do e-mail é montado pelo template customizado (aplicado via
 * Management API) usando `{{ .TokenHash }}` e apontando para o Route
 * Handler `/auth/confirm?...&next=/convite`, que troca o token por uma
 * sessão via cookies no servidor antes de redirecionar — não depende de
 * `redirectTo` aqui, que só afetaria `{{ .ConfirmationURL }}` (não usado
 * pelo template atual).
 */
export async function inviteUserAction(input: unknown): Promise<void> {
  const actorId = await requireAdmin();
  const parsed = inviteUserInputSchema.parse(input);

  const adminSupabase = createAdminClient();
  const { data, error } = await adminSupabase.auth.admin.inviteUserByEmail(parsed.email, {
    data: { full_name: parsed.fullName },
  });
  if (error || !data.user) {
    throw new Error(`Não foi possível convidar o usuário: ${error?.message ?? "erro desconhecido"}`);
  }

  const { error: profileError } = await adminSupabase
    .from("profiles")
    .update({ full_name: parsed.fullName, role: parsed.role })
    .eq("id", data.user.id);
  if (profileError) {
    throw new Error(`Usuário convidado, mas não foi possível definir o papel: ${profileError.message}`);
  }

  await logAudit(actorId, "user.invited", data.user.id, { email: parsed.email, role: parsed.role });
  revalidatePath("/admin/usuarios");
}

export async function updateUserRoleAction(input: unknown): Promise<void> {
  const actorId = await requireAdmin();
  const parsed = updateUserRoleInputSchema.parse(input);

  if (parsed.userId === actorId) {
    throw new Error("Você não pode alterar o próprio papel.");
  }

  const supabase = await createClient();
  const { error } = await supabase.from("profiles").update({ role: parsed.role }).eq("id", parsed.userId);
  if (error) {
    throw new Error(`Não foi possível alterar o papel: ${error.message}`);
  }

  await logAudit(actorId, "user.role_changed", parsed.userId, { role: parsed.role });
  revalidatePath("/admin/usuarios");
}

export async function setUserActiveAction(input: unknown): Promise<void> {
  const actorId = await requireAdmin();
  const parsed = setUserActiveInputSchema.parse(input);

  if (parsed.userId === actorId && !parsed.active) {
    throw new Error("Você não pode desativar a própria conta.");
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("profiles")
    .update({ active: parsed.active })
    .eq("id", parsed.userId);
  if (error) {
    throw new Error(`Não foi possível atualizar o status: ${error.message}`);
  }

  await logAudit(actorId, parsed.active ? "user.activated" : "user.deactivated", parsed.userId);
  revalidatePath("/admin/usuarios");
}
