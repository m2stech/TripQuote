import type { Metadata } from "next";

import { LoginForm } from "@/features/auth/components/LoginForm";

export const metadata: Metadata = {
  title: "Entrar — TripQuote",
};

/**
 * Tela de login, autenticada via Supabase Auth (e-mail/senha).
 */
export default function LoginPage() {
  return (
    <main className="bg-background flex min-h-screen flex-1 items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex flex-col items-center gap-2 text-center">
          <span className="text-snow-navy text-2xl font-bold">TripQuote</span>
          <p className="text-muted-foreground text-sm">
            Entre com sua conta para gerar orçamentos de turismo.
          </p>
        </div>

        <div className="rounded-snow-card border-border bg-card shadow-snow-card border p-6">
          <LoginForm />
        </div>
      </div>
    </main>
  );
}
