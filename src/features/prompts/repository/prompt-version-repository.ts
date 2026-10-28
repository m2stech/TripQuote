import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/lib/supabase/types";
import {
  promptVersionRowSchema,
  type ProductType,
  type PromptVersionRecord,
} from "@/features/prompts/schemas/prompt-version.schema";

function parseRow(row: {
  id: string;
  product_type: string;
  version: number;
  content: string;
  is_active: boolean;
  created_by: string;
  created_at: string;
}) {
  return promptVersionRowSchema.safeParse({
    id: row.id,
    productType: row.product_type,
    version: row.version,
    content: row.content,
    isActive: row.is_active,
    createdBy: row.created_by,
    createdAt: row.created_at,
  });
}

/**
 * Lê a versão ativa do prompt do tipo de produto informado (CLAUDE.md:
 * "prompts versionados em tabela, editáveis só por admin; cada orçamento
 * guarda a versão usada"). A policy `prompt_versions_admin_all` só permite
 * leitura a admin — o consultor que dispara a geração não é admin, então o
 * `supabase` recebido aqui deve ser o client admin (`createAdminClient()`),
 * nunca o client do usuário comum. Coerente com "prompt nunca chega ao
 * consultor/UI".
 */
export async function getActivePromptVersion(
  supabase: SupabaseClient<Database>,
  productType: ProductType,
): Promise<PromptVersionRecord> {
  const { data, error } = await supabase
    .from("prompt_versions")
    .select("*")
    .eq("product_type", productType)
    .eq("is_active", true)
    .maybeSingle();

  if (error) {
    throw new Error(`Não foi possível carregar a versão ativa do prompt: ${error.message}`);
  }
  if (!data) {
    throw new Error("Nenhuma versão de prompt ativa encontrada.");
  }

  const parsed = parseRow(data);
  if (!parsed.success) {
    throw new Error("Versão de prompt ativa com formato inválido.");
  }
  return parsed.data;
}

/** Lista todas as versões do prompt de um tipo de produto, mais recentes primeiro (tela admin). */
export async function listPromptVersions(
  supabase: SupabaseClient<Database>,
  productType: ProductType,
): Promise<PromptVersionRecord[]> {
  const { data, error } = await supabase
    .from("prompt_versions")
    .select("*")
    .eq("product_type", productType)
    .order("version", { ascending: false });

  if (error) {
    throw new Error(`Não foi possível carregar as versões do prompt: ${error.message}`);
  }

  return data.map((row) => {
    const parsed = parseRow(row);
    if (!parsed.success) {
      throw new Error("Versão de prompt com formato inválido.");
    }
    return parsed.data;
  });
}
