import type { Metadata } from "next";
import { Suspense } from "react";

import { InviteContent } from "./InviteContent";

export const metadata: Metadata = {
  title: "Criar conta — SnowQuote",
};

/**
 * Destino (`next=`) do Route Handler `/auth/confirm`, que já trocou o
 * `token_hash` do e-mail de convite por uma sessão autenticada via cookies
 * antes de redirecionar aqui — por isso a sessão é checada diretamente no
 * servidor, sem nenhuma detecção client-side de hash (ver
 * `src/features/users/actions/user-actions.ts`, `inviteUserAction`). O
 * usuário convidado define a própria senha aqui — nunca recebe uma senha
 * temporária por e-mail. A checagem de sessão fica em `InviteContent`,
 * dentro de `<Suspense>`, para não bloquear o prerendering estático do resto
 * da página (ver seu comentário).
 */
export default function AcceptInvitePage() {
  return (
    <main className="bg-background flex min-h-screen flex-1 items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex flex-col items-center gap-2 text-center">
          <span className="text-snow-navy text-2xl font-bold">SnowQuote</span>
          <p className="text-muted-foreground text-sm">
            Você foi convidado para o SnowQuote. Defina uma senha para criar sua conta.
          </p>
        </div>

        <div className="rounded-snow-card border-border bg-card shadow-snow-card border p-6">
          <Suspense fallback={<p className="text-muted-foreground text-sm">Carregando…</p>}>
            <InviteContent />
          </Suspense>
        </div>
      </div>
    </main>
  );
}
