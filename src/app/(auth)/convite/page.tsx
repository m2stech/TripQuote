import type { Metadata } from "next";

import { SetPasswordAndRedirect } from "@/features/auth/components/SetPasswordAndRedirect";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Criar conta — TripQuote",
};

/**
 * Destino (`next=`) do Route Handler `/auth/confirm`, que já trocou o
 * `token_hash` do e-mail de convite por uma sessão autenticada via cookies
 * antes de redirecionar aqui — por isso a sessão é checada diretamente no
 * servidor, sem nenhuma detecção client-side de hash (ver
 * `src/features/users/actions/user-actions.ts`, `inviteUserAction`). O
 * usuário convidado define a própria senha aqui — nunca recebe uma senha
 * temporária por e-mail.
 */
export default async function AcceptInvitePage() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();

  return (
    <main className="bg-background flex min-h-screen flex-1 items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex flex-col items-center gap-2 text-center">
          <span className="text-snow-navy text-2xl font-bold">TripQuote</span>
          <p className="text-muted-foreground text-sm">
            Você foi convidado para o TripQuote. Defina uma senha para criar sua conta.
          </p>
        </div>

        <div className="rounded-snow-card border-border bg-card shadow-snow-card border p-6">
          {data.user ? (
            <SetPasswordAndRedirect
              submitLabel="Criar conta"
              submitLabelPending="Criando conta…"
              successMessage="Conta criada com sucesso. Redirecionando para o TripQuote…"
              redirectTo="/orcamentos"
            />
          ) : (
            <p className="text-destructive text-sm" role="alert">
              Link de convite inválido ou expirado. Peça ao administrador para enviar um novo convite.
            </p>
          )}
        </div>
      </div>
    </main>
  );
}
