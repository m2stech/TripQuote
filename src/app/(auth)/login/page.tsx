import type { Metadata } from "next";
import { Suspense } from "react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { LoginForm } from "@/features/auth/components/LoginForm";

export const metadata: Metadata = {
  title: "Entrar — TripQuote",
};

interface LoginPageProps {
  searchParams: Promise<{ erro?: string }>;
}

/** `?erro=link-invalido` vem do Route Handler `/auth/confirm` quando um link de convite/recuperação de senha é inválido ou expirado. */
async function LoginErrorNotice({ searchParams }: LoginPageProps) {
  const { erro } = await searchParams;
  if (erro !== "link-invalido") return null;

  return (
    <Alert variant="warning" className="mb-4">
      <AlertDescription>
        Link inválido ou expirado. Peça um novo convite ao administrador, ou solicite um novo link em
        &quot;Esqueci minha senha&quot;.
      </AlertDescription>
    </Alert>
  );
}

/**
 * Tela de login, autenticada via Supabase Auth (e-mail/senha).
 * `searchParams` só resolve em runtime (dado dinâmico por request); precisa
 * de Suspense para não bloquear o pré-render estático do shell da página
 * (mesmo padrão de `orcamentos/[id]/page.tsx`).
 */
export default function LoginPage({ searchParams }: LoginPageProps) {
  return (
    <main className="bg-background flex min-h-screen flex-1 items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex flex-col items-center gap-2 text-center">
          <span className="text-snow-navy text-2xl font-bold">TripQuote</span>
          <p className="text-muted-foreground text-sm">
            Entre com sua conta para gerar orçamentos de turismo.
          </p>
        </div>

        <Suspense fallback={null}>
          <LoginErrorNotice searchParams={searchParams} />
        </Suspense>

        <div className="rounded-snow-card border-border bg-card shadow-snow-card border p-6">
          <LoginForm />
        </div>
      </div>
    </main>
  );
}
