import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/lib/supabase/types";
import { brandingSettingsSchema, type BrandingSettings } from "@/features/branding/schemas/branding.schema";

/**
 * Lê a configuração institucional singleton. Se ainda não existir nenhuma
 * linha (banco novo sem admin no momento da migration — ver
 * `..._branding_settings.sql`), cria uma com os valores padrão na primeira
 * leitura, atribuída ao admin que está acessando.
 */
export async function getOrCreateBrandingSettings(
  supabase: SupabaseClient<Database>,
  currentAdminId: string,
): Promise<BrandingSettings> {
  const { data, error } = await supabase.from("branding_settings").select("*").maybeSingle();
  if (error) {
    throw new Error(`Não foi possível carregar a identidade visual: ${error.message}`);
  }

  if (!data) {
    const { data: created, error: insertError } = await supabase
      .from("branding_settings")
      .insert({ updated_by: currentAdminId })
      .select("*")
      .single();
    if (insertError || !created) {
      throw new Error(
        `Não foi possível inicializar a identidade visual: ${insertError?.message ?? "erro desconhecido"}`,
      );
    }
    return toBrandingSettings(created);
  }

  return toBrandingSettings(data);
}

function toBrandingSettings(row: Database["public"]["Tables"]["branding_settings"]["Row"]): BrandingSettings {
  return brandingSettingsSchema.parse({
    id: row.id,
    companyName: row.company_name,
    institutionalFooter: row.institutional_footer,
    institutionalLogoStoragePath: row.institutional_logo_storage_path,
    updatedBy: row.updated_by,
    updatedAt: row.updated_at,
  });
}
