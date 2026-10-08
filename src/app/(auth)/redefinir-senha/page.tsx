import type { Metadata } from "next";

import { SetPasswordAndRedirect } from "@/features/auth/components/SetPasswordAndRedirect";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Redefinir senha — SnowQuote",
};

/**
 * Destino (`next=`) do Route Handler `/auth/confirm`, que já trocou o
 * `token_hash` do e-mail de recuperação por uma sessão autenticada via
 * cookies antes de redirecionar aqui (ver
 * `src/features/auth/actions/request-password-reset.ts`).
 */
export default async function ResetPasswordPage() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();

  return (
    <main className="bg-background flex min-h-screen flex-1 items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex flex-col items-center gap-2 text-center">
          <span className="text-snow-navy text-2xl font-bold">SnowQuote</span>
          <p className="text-muted-foreground text-sm">Escolha uma nova senha para sua conta.</p>
        </div>

        <div className="rounded-snow-card border-border bg-card shadow-snow-card border p-6">
          {data.user ? (
            <SetPasswordAndRedirect
              submitLabel="Salvar nova senha"
              submitLabelPending="Salvando…"
              successMessage="Senha redefinida com sucesso. Redirecionando para o SnowQuote…"
              redirectTo="/orcamentos"
            />
          ) : (
            <p className="text-destructive text-sm" role="alert">
              Link de redefinição inválido ou expirado. Solicite um novo link em &quot;Esqueci minha
              senha&quot;.
            </p>
          )}
        </div>
      </div>
    </main>
  );
}
