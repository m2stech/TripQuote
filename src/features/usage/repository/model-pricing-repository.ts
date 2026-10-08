import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/lib/supabase/types";
import {
  modelPricingRowSchema,
  type ModelPricingRecord,
} from "@/features/usage/schemas/model-pricing.schema";

function toModelPricingRecord(
  row: Database["public"]["Tables"]["model_pricing"]["Row"],
): ModelPricingRecord {
  const parsed = modelPricingRowSchema.safeParse({
    model: row.model,
    inputPerMillionUsd: row.input_per_million_usd,
    outputPerMillionUsd: row.output_per_million_usd,
    updatedBy: row.updated_by,
    updatedAt: row.updated_at,
  });
  if (!parsed.success) {
    throw new Error("Preço de modelo com formato inválido.");
  }
  return parsed.data;
}

/** Lista os preços cadastrados, por modelo (tela admin). */
export async function listModelPricing(
  supabase: SupabaseClient<Database>,
): Promise<ModelPricingRecord[]> {
  const { data, error } = await supabase.from("model_pricing").select("*").order("model");
  if (error) {
    throw new Error(`Não foi possível carregar os preços por modelo: ${error.message}`);
  }
  return data.map(toModelPricingRecord);
}

/**
 * Mapa `model -> preço`, usado pelo cálculo de custo estimado em
 * `estimate-cost.ts` no lugar da constante `MODEL_PRICING` hardcoded.
 */
export async function getModelPricingMap(
  supabase: SupabaseClient<Database>,
): Promise<Map<string, { inputPerMillion: number; outputPerMillion: number }>> {
  const { data, error } = await supabase
    .from("model_pricing")
    .select("model, input_per_million_usd, output_per_million_usd");
  if (error) {
    throw new Error(`Não foi possível carregar os preços por modelo: ${error.message}`);
  }

  return new Map(
    data.map((row) => [
      row.model,
      { inputPerMillion: row.input_per_million_usd, outputPerMillion: row.output_per_million_usd },
    ]),
  );
}

/** Cria ou atualiza o preço de um modelo (upsert pela chave primária `model`). */
export async function upsertModelPricing(
  supabase: SupabaseClient<Database>,
  input: { model: string; inputPerMillionUsd: number; outputPerMillionUsd: number },
  actorId: string,
): Promise<ModelPricingRecord> {
  const { data, error } = await supabase
    .from("model_pricing")
    .upsert({
      model: input.model,
      input_per_million_usd: input.inputPerMillionUsd,
      output_per_million_usd: input.outputPerMillionUsd,
      updated_by: actorId,
    })
    .select("*")
    .single();
  if (error || !data) {
    throw new Error(`Não foi possível salvar o preço do modelo: ${error?.message ?? "erro desconhecido"}`);
  }
  return toModelPricingRecord(data);
}
