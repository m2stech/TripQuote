import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: vi.fn() }));
vi.mock("@/lib/supabase/server", () => ({ createClient: vi.fn() }));
vi.mock("@/lib/auth/require-admin", () => ({ requireAdmin: vi.fn() }));
vi.mock("@/features/branding/repository/branding-repository", () => ({
  getOrCreateBrandingSettings: vi.fn(),
}));
vi.mock("@/features/branding/storage/branding-logo-storage", async () => {
  const actual = await vi.importActual<
    typeof import("@/features/branding/storage/branding-logo-storage")
  >("@/features/branding/storage/branding-logo-storage");
  return {
    ...actual,
    createSignedInstitutionalLogoUrl: vi.fn(),
    uploadInstitutionalLogo: vi.fn(),
  };
});

import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth/require-admin";
import { getOrCreateBrandingSettings } from "@/features/branding/repository/branding-repository";
import {
  createSignedInstitutionalLogoUrl,
  uploadInstitutionalLogo,
} from "@/features/branding/storage/branding-logo-storage";
import {
  getInstitutionalFooterAction,
  updateBrandingSettingsAction,
  uploadInstitutionalLogoAction,
} from "@/features/branding/actions/branding-actions";
import {
  FIXED_INSTITUTIONAL_FOOTER,
  INSTITUTIONAL_LOGO_URL,
} from "@/features/quotes/schemas/quote-form.schema";

const actorId = "admin-1";

describe("getInstitutionalFooterAction", () => {
  it("não exige admin (leitura pública) e cai nos valores fixos sem configuração salva", async () => {
    const maybeSingle = vi.fn().mockResolvedValue({ data: null });
    const from = vi.fn().mockReturnValue({ select: vi.fn().mockReturnValue({ maybeSingle }) });
    vi.mocked(createClient).mockResolvedValue({ from } as never);

    const result = await getInstitutionalFooterAction();

    expect(result).toEqual({ logoUrl: INSTITUTIONAL_LOGO_URL, footerText: FIXED_INSTITUTIONAL_FOOTER });
  });

  it("usa a logo e o texto configurados quando existem", async () => {
    const maybeSingle = vi.fn().mockResolvedValue({
      data: { institutional_footer: "Rodapé custom", institutional_logo_storage_path: "institutional-logo" },
    });
    const from = vi.fn().mockReturnValue({ select: vi.fn().mockReturnValue({ maybeSingle }) });
    vi.mocked(createClient).mockResolvedValue({ from } as never);
    vi.mocked(createSignedInstitutionalLogoUrl).mockResolvedValue("https://signed.example/logo.png");

    const result = await getInstitutionalFooterAction();

    expect(result).toEqual({ logoUrl: "https://signed.example/logo.png", footerText: "Rodapé custom" });
  });
});

describe("branding-actions (escrita, exige admin)", () => {
  let auditInsert: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.mocked(requireAdmin).mockResolvedValue(actorId);
    auditInsert = vi.fn().mockResolvedValue({ error: null });
    vi.mocked(createAdminClient).mockReturnValue({
      from: vi.fn().mockReturnValue({ insert: auditInsert }),
    } as never);
  });

  describe("updateBrandingSettingsAction", () => {
    it("propaga o erro de autorização sem tocar no banco", async () => {
      vi.mocked(requireAdmin).mockRejectedValueOnce(
        new Error("Apenas administradores podem executar esta ação."),
      );
      const from = vi.fn();
      vi.mocked(createClient).mockResolvedValue({ from } as never);

      await expect(
        updateBrandingSettingsAction({ companyName: "SNOW", institutionalFooter: "Rodapé" }),
      ).rejects.toThrow("Apenas administradores");
      expect(from).not.toHaveBeenCalled();
    });

    it("atualiza nome e rodapé na linha singleton atual e registra auditoria", async () => {
      vi.mocked(getOrCreateBrandingSettings).mockResolvedValue({
        id: "branding-1",
        companyName: "SNOW Operadora",
        institutionalFooter: "Antigo",
        institutionalLogoStoragePath: null,
        updatedBy: actorId,
        updatedAt: new Date().toISOString(),
      });
      const eq = vi.fn().mockResolvedValue({ error: null });
      const update = vi.fn().mockReturnValue({ eq });
      const from = vi.fn().mockReturnValue({ update });
      vi.mocked(createClient).mockResolvedValue({ from } as never);

      await updateBrandingSettingsAction({ companyName: "Nova SNOW", institutionalFooter: "Novo rodapé" });

      expect(update).toHaveBeenCalledWith({
        company_name: "Nova SNOW",
        institutional_footer: "Novo rodapé",
        updated_by: actorId,
      });
      expect(eq).toHaveBeenCalledWith("id", "branding-1");
      expect(auditInsert).toHaveBeenCalledWith(
        expect.objectContaining({ action: "branding.settings_updated", entity_id: "branding-1" }),
      );
    });
  });

  describe("uploadInstitutionalLogoAction", () => {
    it("rejeita quando nenhum arquivo é enviado", async () => {
      const formData = new FormData();
      await expect(uploadInstitutionalLogoAction(formData)).rejects.toThrow("Nenhum arquivo enviado");
    });

    it("envia a logo, registra o storage path e audita", async () => {
      vi.mocked(getOrCreateBrandingSettings).mockResolvedValue({
        id: "branding-1",
        companyName: "SNOW Operadora",
        institutionalFooter: "Texto",
        institutionalLogoStoragePath: null,
        updatedBy: actorId,
        updatedAt: new Date().toISOString(),
      });
      vi.mocked(uploadInstitutionalLogo).mockResolvedValue("institutional-logo");
      const eq = vi.fn().mockResolvedValue({ error: null });
      const update = vi.fn().mockReturnValue({ eq });
      const from = vi.fn().mockReturnValue({ update });
      vi.mocked(createClient).mockResolvedValue({ from } as never);

      const formData = new FormData();
      formData.set("file", new File([new Uint8Array([1, 2, 3])], "logo.png", { type: "image/png" }));

      await uploadInstitutionalLogoAction(formData);

      expect(update).toHaveBeenCalledWith({
        institutional_logo_storage_path: "institutional-logo",
        updated_by: actorId,
      });
      expect(auditInsert).toHaveBeenCalledWith(
        expect.objectContaining({ action: "branding.logo_updated", entity_id: "branding-1" }),
      );
    });
  });
});
