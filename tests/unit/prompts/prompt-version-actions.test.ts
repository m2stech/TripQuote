import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: vi.fn() }));
vi.mock("@/lib/supabase/server", () => ({ createClient: vi.fn() }));
vi.mock("@/lib/auth/require-admin", () => ({ requireAdmin: vi.fn() }));
vi.mock("@/features/prompts/repository/prompt-version-repository", () => ({
  listPromptVersions: vi.fn(),
  getActivePromptVersion: vi.fn(),
}));

import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth/require-admin";
import {
  activatePromptVersionAction,
  createPromptVersionAction,
} from "@/features/prompts/actions/prompt-version-actions";

const actorId = "admin-1";

/** Fake mínimo de `prompt_versions`: suporta select/update/insert encadeados como usados pelas actions. */
function createPromptVersionsTableMock(options: { latestVersion: number | null }) {
  const selectLatest = vi.fn().mockReturnValue({
    order: vi.fn().mockReturnValue({
      limit: vi.fn().mockReturnValue({
        maybeSingle: vi.fn().mockResolvedValue({
          data: options.latestVersion !== null ? { version: options.latestVersion } : null,
          error: null,
        }),
      }),
    }),
  });

  const deactivateEq = vi.fn().mockResolvedValue({ error: null });
  const activateEq = vi.fn().mockResolvedValue({ error: null });

  const update = vi.fn().mockImplementation((patch: { is_active: boolean }) => ({
    eq: patch.is_active ? activateEq : deactivateEq,
  }));

  const insertSingle = vi.fn().mockResolvedValue({ data: { id: "prompt-new" }, error: null });
  const insert = vi.fn().mockReturnValue({ select: vi.fn().mockReturnValue({ single: insertSingle }) });

  return { selectLatest, update, insert, deactivateEq, activateEq, insertSingle };
}

describe("prompt-version-actions", () => {
  let auditInsert: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.mocked(requireAdmin).mockResolvedValue(actorId);
    auditInsert = vi.fn().mockResolvedValue({ error: null });
    vi.mocked(createAdminClient).mockReturnValue({
      from: vi.fn().mockReturnValue({ insert: auditInsert }),
    } as never);
  });

  describe("createPromptVersionAction", () => {
    it("propaga o erro de autorização sem tentar ler ou escrever no banco", async () => {
      vi.mocked(requireAdmin).mockRejectedValueOnce(
        new Error("Apenas administradores podem executar esta ação."),
      );
      const from = vi.fn();
      vi.mocked(createClient).mockResolvedValue({ from } as never);

      await expect(
        createPromptVersionAction({ content: "novo texto", activate: false }),
      ).rejects.toThrow("Apenas administradores");
      expect(from).not.toHaveBeenCalled();
    });

    it("numera a nova versão como a última + 1 e não desativa nada quando activate=false", async () => {
      const table = createPromptVersionsTableMock({ latestVersion: 3 });
      const from = vi.fn().mockReturnValue({
        select: table.selectLatest,
        update: table.update,
        insert: table.insert,
      });
      vi.mocked(createClient).mockResolvedValue({ from } as never);

      await createPromptVersionAction({ content: "novo texto", activate: false });

      expect(table.insert).toHaveBeenCalledWith({
        version: 4,
        content: "novo texto",
        is_active: false,
        created_by: actorId,
      });
      expect(table.update).not.toHaveBeenCalled();
      expect(auditInsert).toHaveBeenCalledWith(
        expect.objectContaining({ action: "prompt.created", entity_id: "prompt-new" }),
      );
    });

    it("sem nenhuma versão existente, começa em 1", async () => {
      const table = createPromptVersionsTableMock({ latestVersion: null });
      const from = vi.fn().mockReturnValue({
        select: table.selectLatest,
        update: table.update,
        insert: table.insert,
      });
      vi.mocked(createClient).mockResolvedValue({ from } as never);

      await createPromptVersionAction({ content: "primeira versão", activate: true });

      expect(table.insert).toHaveBeenCalledWith(
        expect.objectContaining({ version: 1, is_active: true }),
      );
    });

    it("com activate=true, desativa a versão corrente antes de inserir a nova já ativa", async () => {
      const table = createPromptVersionsTableMock({ latestVersion: 1 });
      const from = vi.fn().mockReturnValue({
        select: table.selectLatest,
        update: table.update,
        insert: table.insert,
      });
      vi.mocked(createClient).mockResolvedValue({ from } as never);

      await createPromptVersionAction({ content: "nova versão ativa", activate: true });

      expect(table.deactivateEq).toHaveBeenCalledWith("is_active", true);
      expect(table.insert).toHaveBeenCalledWith(
        expect.objectContaining({ version: 2, is_active: true }),
      );
      expect(auditInsert).toHaveBeenCalledWith(
        expect.objectContaining({ action: "prompt.created_and_activated" }),
      );
    });

    it("rejeita conteúdo vazio antes de tocar no banco", async () => {
      const from = vi.fn();
      vi.mocked(createClient).mockResolvedValue({ from } as never);

      await expect(createPromptVersionAction({ content: "   ", activate: false })).rejects.toThrow();
      expect(from).not.toHaveBeenCalled();
    });
  });

  describe("activatePromptVersionAction", () => {
    it("desativa a versão ativa atual e ativa a versão indicada", async () => {
      const table = createPromptVersionsTableMock({ latestVersion: 2 });
      const from = vi.fn().mockReturnValue({ update: table.update });
      vi.mocked(createClient).mockResolvedValue({ from } as never);

      await activatePromptVersionAction("prompt-2");

      expect(table.deactivateEq).toHaveBeenCalledWith("is_active", true);
      expect(table.activateEq).toHaveBeenCalledWith("id", "prompt-2");
      expect(auditInsert).toHaveBeenCalledWith(
        expect.objectContaining({ action: "prompt.activated", entity_id: "prompt-2" }),
      );
    });

    it("propaga o erro de autorização sem tocar no banco", async () => {
      vi.mocked(requireAdmin).mockRejectedValueOnce(
        new Error("Apenas administradores podem executar esta ação."),
      );
      const from = vi.fn();
      vi.mocked(createClient).mockResolvedValue({ from } as never);

      await expect(activatePromptVersionAction("prompt-2")).rejects.toThrow("Apenas administradores");
      expect(from).not.toHaveBeenCalled();
    });
  });
});
