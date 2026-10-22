import "server-only";

import { createClient } from "@/lib/supabase/server";
import { requireCurrentUserId } from "@/lib/auth/require-current-user-id";
import type { Database } from "@/lib/supabase/types";

type UserRole = Database["public"]["Enums"]["user_role"];

/**
 * Papel do usuário autenticado, para decisões de UI (ex.: mostrar o filtro
 * "apenas as minhas"/"todas" na listagem de orçamentos, só para admin).
 * Diferente de `requireAdmin`, não lança erro — é usada para ramificar a
 * renderização, não para proteger uma ação.
 */
export async function getCurrentUserRole(): Promise<UserRole> {
  const userId = await requireCurrentUserId();

  const supabase = await createClient();
  const { data, error } = await supabase.from("profiles").select("role").eq("id", userId).single();

  if (error) {
    throw new Error("Não foi possível obter o perfil do usuário.");
  }

  return data.role;
}
