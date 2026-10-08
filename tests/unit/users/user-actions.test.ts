import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: vi.fn() }));
vi.mock("@/lib/supabase/server", () => ({ createClient: vi.fn() }));
vi.mock("@/lib/auth/require-admin", () => ({ requireAdmin: vi.fn() }));
vi.mock("@/features/users/repository/user-repository", () => ({ listUsers: vi.fn() }));

import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth/require-admin";
import {
  inviteUserAction,
  setUserActiveAction,
  updateUserRoleAction,
} from "@/features/users/actions/user-actions";

const actorId = "admin-1";

describe("user-actions", () => {
  let auditInsert: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.mocked(requireAdmin).mockResolvedValue(actorId);
    auditInsert = vi.fn().mockResolvedValue({ error: null });
    vi.mocked(createAdminClient).mockReturnValue({
      from: vi.fn().mockReturnValue({ insert: auditInsert }),
      auth: { admin: { inviteUserByEmail: vi.fn() } },
    } as never);
  });

  describe("updateUserRoleAction", () => {
    it("propaga o erro de autorização sem tocar no banco", async () => {
      vi.mocked(requireAdmin).mockRejectedValueOnce(
        new Error("Apenas administradores podem executar esta ação."),
      );
      const from = vi.fn();
      vi.mocked(createClient).mockResolvedValue({ from } as never);

      await expect(
        updateUserRoleAction({ userId: "user-2", role: "admin" }),
      ).rejects.toThrow("Apenas administradores");
      expect(from).not.toHaveBeenCalled();
    });

    it("recusa alterar o próprio papel", async () => {
      const from = vi.fn();
      vi.mocked(createClient).mockResolvedValue({ from } as never);

      await expect(
        updateUserRoleAction({ userId: actorId, role: "consultant" }),
      ).rejects.toThrow("não pode alterar o próprio papel");
      expect(from).not.toHaveBeenCalled();
    });

    it("atualiza o papel de outro usuário e registra auditoria", async () => {
      const eq = vi.fn().mockResolvedValue({ error: null });
      const update = vi.fn().mockReturnValue({ eq });
      const from = vi.fn().mockReturnValue({ update });
      vi.mocked(createClient).mockResolvedValue({ from } as never);

      await updateUserRoleAction({ userId: "user-2", role: "admin" });

      expect(update).toHaveBeenCalledWith({ role: "admin" });
      expect(eq).toHaveBeenCalledWith("id", "user-2");
      expect(auditInsert).toHaveBeenCalledWith(
        expect.objectContaining({ action: "user.role_changed", entity_id: "user-2" }),
      );
    });
  });

  describe("setUserActiveAction", () => {
    it("recusa desativar a própria conta", async () => {
      const from = vi.fn();
      vi.mocked(createClient).mockResolvedValue({ from } as never);

      await expect(setUserActiveAction({ userId: actorId, active: false })).rejects.toThrow(
        "não pode desativar a própria conta",
      );
      expect(from).not.toHaveBeenCalled();
    });

    it("permite o admin reativar a própria conta", async () => {
      const eq = vi.fn().mockResolvedValue({ error: null });
      const update = vi.fn().mockReturnValue({ eq });
      const from = vi.fn().mockReturnValue({ update });
      vi.mocked(createClient).mockResolvedValue({ from } as never);

      await setUserActiveAction({ userId: actorId, active: true });

      expect(update).toHaveBeenCalledWith({ active: true });
    });

    it("desativa outro usuário e registra auditoria", async () => {
      const eq = vi.fn().mockResolvedValue({ error: null });
      const update = vi.fn().mockReturnValue({ eq });
      const from = vi.fn().mockReturnValue({ update });
      vi.mocked(createClient).mockResolvedValue({ from } as never);

      await setUserActiveAction({ userId: "user-2", active: false });

      expect(auditInsert).toHaveBeenCalledWith(
        expect.objectContaining({ action: "user.deactivated", entity_id: "user-2" }),
      );
    });
  });

  describe("inviteUserAction", () => {
    it("rejeita e-mail inválido antes de chamar a Auth Admin API", async () => {
      const inviteUserByEmail = vi.fn();
      vi.mocked(createAdminClient).mockReturnValue({
        from: vi.fn().mockReturnValue({ insert: auditInsert }),
        auth: { admin: { inviteUserByEmail } },
      } as never);

      await expect(
        inviteUserAction({ email: "invalido", fullName: "Nome", role: "consultant" }),
      ).rejects.toThrow();
      expect(inviteUserByEmail).not.toHaveBeenCalled();
    });

    it("convida o usuário e define nome/papel no profile", async () => {
      const inviteUserByEmail = vi
        .fn()
        .mockResolvedValue({ data: { user: { id: "user-3" } }, error: null });
      const profileEq = vi.fn().mockResolvedValue({ error: null });
      const profileUpdate = vi.fn().mockReturnValue({ eq: profileEq });
      vi.mocked(createAdminClient).mockReturnValue({
        from: vi.fn().mockImplementation((table: string) =>
          table === "profiles" ? { update: profileUpdate } : { insert: auditInsert },
        ),
        auth: { admin: { inviteUserByEmail } },
      } as never);

      await inviteUserAction({ email: "novo@snow.com.br", fullName: "Novo Consultor", role: "consultant" });

      expect(inviteUserByEmail).toHaveBeenCalledWith(
        "novo@snow.com.br",
        expect.objectContaining({ data: { full_name: "Novo Consultor" } }),
      );
      expect(profileUpdate).toHaveBeenCalledWith({ full_name: "Novo Consultor", role: "consultant" });
      expect(profileEq).toHaveBeenCalledWith("id", "user-3");
    });
  });
});
