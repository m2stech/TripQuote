"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdmin } from "@/lib/auth/require-admin";
import {
  listModelPricing,
  upsertModelPricing,
} from "@/features/usage/repository/model-pricing-repository";
import {
  upsertModelPricingInputSchema,
  type ModelPricingRecord,
} from "@/features/usage/schemas/model-pricing.schema";

/** `entity_id` de `audit_log` é `uuid`; o identificador do modelo (ex. "gpt-4.1") não é um uuid, por isso vai em `metadata`. */
async function logAudit(actorId: string, action: string, model: string) {
  const adminSupabase = createAdminClient();
  await adminSupabase.from("audit_log").insert({
    actor_id: actorId,
    action,
    entity_type: "model_pricing",
    metadata: { model },
  });
}

export async function listModelPricingAction(): Promise<ModelPricingRecord[]> {
  await requireAdmin();
  const supabase = await createClient();
  return listModelPricing(supabase);
}

export async function upsertModelPricingAction(input: unknown): Promise<ModelPricingRecord> {
  const actorId = await requireAdmin();
  const parsed = upsertModelPricingInputSchema.parse(input);

  const supabase = await createClient();
  const record = await upsertModelPricing(supabase, parsed, actorId);

  await logAudit(actorId, "model_pricing.updated", record.model);
  revalidatePath("/admin/consumo");
  return record;
}
