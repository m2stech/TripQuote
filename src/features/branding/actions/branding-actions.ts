"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdmin } from "@/lib/auth/require-admin";
import { getOrCreateBrandingSettings } from "@/features/branding/repository/branding-repository";
import {
  createSignedInstitutionalLogoUrl,
  uploadInstitutionalLogo,
  BrandingLogoValidationError,
} from "@/features/branding/storage/branding-logo-storage";
import { updateBrandingSettingsInputSchema } from "@/features/branding/schemas/branding.schema";
import type { BrandingSettings } from "@/features/branding/schemas/branding.schema";
import {
  FIXED_INSTITUTIONAL_FOOTER,
  INSTITUTIONAL_LOGO_URL,
} from "@/features/quotes/schemas/quote-form.schema";

export interface InstitutionalFooterView {
  logoUrl: string;
  footerText: string;
}

/**
 * Leitura pública (qualquer autenticado) usada pela seção 08 do formulário
 * (`QuoteForm`) para exibir a logo e o texto institucional configurados pelo
 * admin — sem `requireAdmin`, pois a policy `branding_settings_select_authenticated`
 * libera a leitura a qualquer usuário autenticado, não só admin.
 */
export async function getInstitutionalFooterAction(): Promise<InstitutionalFooterView> {
  const supabase = await createClient();

  const { data } = await supabase
    .from("branding_settings")
    .select("institutional_footer, institutional_logo_storage_path")
    .maybeSingle();

  const logoUrl = data?.institutional_logo_storage_path
    ? await createSignedInstitutionalLogoUrl(supabase, data.institutional_logo_storage_path)
    : null;

  return {
    logoUrl: logoUrl ?? INSTITUTIONAL_LOGO_URL,
    footerText: data?.institutional_footer ?? FIXED_INSTITUTIONAL_FOOTER,
  };
}

async function logAudit(actorId: string, action: string, entityId: string) {
  const adminSupabase = createAdminClient();
  await adminSupabase.from("audit_log").insert({
    actor_id: actorId,
    action,
    entity_type: "branding_settings",
    entity_id: entityId,
  });
}

export interface BrandingSettingsView {
  settings: BrandingSettings;
  logoPreviewUrl: string | null;
}

export async function getBrandingSettingsAction(): Promise<BrandingSettingsView> {
  const actorId = await requireAdmin();
  const supabase = await createClient();

  const settings = await getOrCreateBrandingSettings(supabase, actorId);
  const logoPreviewUrl = settings.institutionalLogoStoragePath
    ? await createSignedInstitutionalLogoUrl(supabase, settings.institutionalLogoStoragePath)
    : null;

  return { settings, logoPreviewUrl };
}

export async function updateBrandingSettingsAction(input: unknown): Promise<void> {
  const actorId = await requireAdmin();
  const parsed = updateBrandingSettingsInputSchema.parse(input);

  const supabase = await createClient();
  const current = await getOrCreateBrandingSettings(supabase, actorId);

  const { error } = await supabase
    .from("branding_settings")
    .update({
      company_name: parsed.companyName,
      institutional_footer: parsed.institutionalFooter,
      updated_by: actorId,
    })
    .eq("id", current.id);
  if (error) {
    throw new Error(`Não foi possível salvar as configurações: ${error.message}`);
  }

  await logAudit(actorId, "branding.settings_updated", current.id);
  revalidatePath("/admin/identidade-visual");
}

export async function uploadInstitutionalLogoAction(formData: FormData): Promise<void> {
  const actorId = await requireAdmin();

  const file = formData.get("file");
  if (!(file instanceof File)) {
    throw new Error("Nenhum arquivo enviado.");
  }

  const supabase = await createClient();
  const current = await getOrCreateBrandingSettings(supabase, actorId);

  try {
    const storagePath = await uploadInstitutionalLogo(supabase, file);

    const { error } = await supabase
      .from("branding_settings")
      .update({ institutional_logo_storage_path: storagePath, updated_by: actorId })
      .eq("id", current.id);
    if (error) {
      throw new Error(`Logo enviada, mas não foi possível registrá-la: ${error.message}`);
    }

    await logAudit(actorId, "branding.logo_updated", current.id);
    revalidatePath("/admin/identidade-visual");
  } catch (error) {
    if (error instanceof BrandingLogoValidationError) {
      throw new Error(error.message);
    }
    throw error;
  }
}
