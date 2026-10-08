import "server-only";

import { createClient } from "@/lib/supabase/server";
import { requireCurrentUserId } from "@/lib/auth/require-current-user-id";

/**
 * Fronteira de autorização para Server Actions administrativas (usuários,
 * prompts, identidade visual). O middleware já bloqueia a navegação para
 * `/admin` por papel, mas uma Server Action pode ser invocada diretamente
 * pelo client sem passar pela rota — por isso ela também precisa checar o
 * papel no servidor (defesa em profundidade, CLAUDE.md).
 */
export async function requireAdmin(): Promise<string> {
  const userId = await requireCurrentUserId();

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", userId)
    .single();

  if (error || data.role !== "admin") {
    throw new Error("Apenas administradores podem executar esta ação.");
  }

  return userId;
}
