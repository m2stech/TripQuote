import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/supabase/server", () => ({ createClient: vi.fn() }));

import { createClient } from "@/lib/supabase/server";
import { requestPasswordResetAction } from "@/features/auth/actions/request-password-reset";

describe("requestPasswordResetAction", () => {
  let resetPasswordForEmail: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    resetPasswordForEmail = vi.fn().mockResolvedValue({ error: null });
    vi.mocked(createClient).mockResolvedValue({
      auth: { resetPasswordForEmail },
    } as never);
  });

  it("dispara o e-mail de recuperação para o endereço informado", async () => {
    await requestPasswordResetAction({ email: "user@example.com" });

    expect(resetPasswordForEmail).toHaveBeenCalledWith("user@example.com");
  });

  it("não chama o Supabase para e-mail inválido (falha silenciosa, sem revelar validação ao atacante)", async () => {
    await requestPasswordResetAction({ email: "não-é-email" });

    expect(resetPasswordForEmail).not.toHaveBeenCalled();
  });

  it("não lança mesmo se o Supabase retornar erro (nunca revela se o e-mail existe)", async () => {
    resetPasswordForEmail.mockResolvedValue({ error: { message: "user not found" } });

    await expect(requestPasswordResetAction({ email: "user@example.com" })).resolves.toBeUndefined();
  });
});
