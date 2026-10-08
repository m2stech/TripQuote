import type { Metadata } from "next";
import { Suspense } from "react";

import { ResetPasswordContent } from "./ResetPasswordContent";

export const metadata: Metadata = {
  title: "Redefinir senha — SnowQuote",
};

/**
 * Destino (`next=`) do Route Handler `/auth/confirm`, que já trocou o
 * `token_hash` do e-mail de recuperação por uma sessão autenticada via
 * cookies antes de redirecionar aqui (ver
 * `src/features/auth/actions/request-password-reset.ts`). A checagem de
 * sessão fica em `ResetPasswordContent`, dentro de `<Suspense>`, para não
 * bloquear o prerendering estático do resto da página.
 */
export default function ResetPasswordPage() {
  return (
    <main className="bg-background flex min-h-screen flex-1 items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex flex-col items-center gap-2 text-center">
          <span className="text-snow-navy text-2xl font-bold">SnowQuote</span>
          <p className="text-muted-foreground text-sm">Escolha uma nova senha para sua conta.</p>
        </div>

        <div className="rounded-snow-card border-border bg-card shadow-snow-card border p-6">
          <Suspense fallback={<p className="text-muted-foreground text-sm">Carregando…</p>}>
            <ResetPasswordContent />
          </Suspense>
        </div>
      </div>
    </main>
  );
}
