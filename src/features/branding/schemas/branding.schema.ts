import "server-only";

import { z } from "zod";

/** Espelha a linha singleton de `branding_settings`. */
export const brandingSettingsSchema = z.object({
  id: z.string(),
  companyName: z.string(),
  institutionalFooter: z.string(),
  institutionalLogoStoragePath: z.string().nullable(),
  updatedBy: z.string(),
  updatedAt: z.string(),
});

export type BrandingSettings = z.infer<typeof brandingSettingsSchema>;

export const updateBrandingSettingsInputSchema = z.object({
  companyName: z.string().trim().min(1, "Informe o nome da empresa.").max(200),
  institutionalFooter: z.string().trim().min(1, "Informe o texto do rodapé institucional.").max(500),
});

export type UpdateBrandingSettingsInput = z.infer<typeof updateBrandingSettingsInputSchema>;
