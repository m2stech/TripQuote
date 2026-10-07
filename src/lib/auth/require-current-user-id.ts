import "server-only";

import { createClient } from "@/lib/supabase/server";

/**
 * Fronteira de autenticação compartilhada por Server Actions: nunca confiar
 * em dados vindos do client sem antes confirmar a sessão no backend.
 * Extraída de `quote-actions.ts`/`attachment-actions.ts`, que duplicavam a
 * mesma lógica.
 */
export async function requireCurrentUserId(): Promise<string> {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) {
    throw new Error("Sessão expirada. Faça login novamente.");
  }
  return data.user.id;
}
