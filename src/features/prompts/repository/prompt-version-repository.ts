import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/lib/supabase/types";
import {
  promptVersionRowSchema,
  type PromptVersionRecord,
} from "@/features/prompts/schemas/prompt-version.schema";

/**
 * Lê a versão ativa do prompt (CLAUDE.md: "prompts versionados em tabela,
 * editáveis só por admin; cada orçamento guarda a versão usada"). A policy
 * `prompt_versions_admin_all` só permite leitura a admin — o consultor que
 * dispara a geração não é admin, então o `supabase` recebido aqui deve ser
 * o client admin (`createAdminClient()`), nunca o client do usuário comum.
 * Coerente com "prompt nunca chega ao consultor/UI".
 */
export async function getActivePromptVersion(
  supabase: SupabaseClient<Database>,
): Promise<PromptVersionRecord> {
  const { data, error } = await supabase
    .from("prompt_versions")
    .select("*")
    .eq("is_active", true)
    .maybeSingle();

  if (error) {
    throw new Error(`Não foi possível carregar a versão ativa do prompt: ${error.message}`);
  }
  if (!data) {
    throw new Error("Nenhuma versão de prompt ativa encontrada.");
  }

  return promptVersionRowSchema.parse({
    id: data.id,
    version: data.version,
    content: data.content,
    isActive: data.is_active,
    createdBy: data.created_by,
    createdAt: data.created_at,
  });
}
