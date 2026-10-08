import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import { fetchExternalImage } from "@/features/pptx/images/fetch-external-image";
import { resolveContainSizing, type BoxInches } from "@/features/pptx/images/resolve-image-sizing";
import type { ResolvedImage } from "@/features/pptx/types";
import { downloadInstitutionalLogo } from "@/features/branding/storage/branding-logo-storage";
import {
  FIXED_INSTITUTIONAL_FOOTER,
  INSTITUTIONAL_LOGO_URL,
} from "@/features/quotes/schemas/quote-form.schema";
import type { Database } from "@/lib/supabase/types";

export interface InstitutionalBranding {
  logo: ResolvedImage;
  footerText: string;
}

/**
 * Busca a logo e o texto institucionais gerenciados pelo admin (M8, tabela
 * `branding_settings` e bucket `branding-assets`); se nenhum admin tiver
 * configurado ainda (sem linha, ou linha sem `institutional_logo_storage_path`),
 * cai para os valores fixos históricos (URL externa + texto fixo). Qualquer
 * falha na resolução da logo → placeholder (rodapé segue sem logo, mas com o
 * texto — nunca quebra a geração por isso). A policy
 * `branding_settings_select_authenticated` libera leitura a qualquer usuário
 * autenticado, então o client comum do consultor que está gerando o .pptx já
 * tem acesso.
 */
export async function resolveInstitutionalBranding(
  supabase: SupabaseClient<Database>,
  box: BoxInches,
): Promise<InstitutionalBranding> {
  const { data: settings } = await supabase
    .from("branding_settings")
    .select("institutional_footer, institutional_logo_storage_path")
    .maybeSingle();

  const footerText = settings?.institutional_footer ?? FIXED_INSTITUTIONAL_FOOTER;

  const managedBuffer = settings?.institutional_logo_storage_path
    ? await downloadInstitutionalLogo(supabase, settings.institutional_logo_storage_path)
    : null;

  const buffer = managedBuffer ?? (await fetchExternalImage(INSTITUTIONAL_LOGO_URL))?.buffer ?? null;
  if (!buffer) return { logo: { kind: "placeholder" }, footerText };

  try {
    const sizing = await resolveContainSizing(buffer, box);
    return { logo: { kind: "image", data: buffer, sizing }, footerText };
  } catch {
    return { logo: { kind: "placeholder" }, footerText };
  }
}
