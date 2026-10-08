import { SetPasswordAndRedirect } from "@/features/auth/components/SetPasswordAndRedirect";
import { createClient } from "@/lib/supabase/server";

/**
 * Isolado em um componente server próprio (e não inline em `page.tsx`) para
 * que o acesso a `cookies()` (via `createClient()`) fique dentro de um
 * `<Suspense>` — sem isso, o Next.js (`cacheComponents: true`) bloqueia o
 * build de produção com "uncached or runtime data during prerendering".
 */
export async function InviteContent() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();

  if (!data.user) {
    return (
      <p className="text-destructive text-sm" role="alert">
        Link de convite inválido ou expirado. Peça ao administrador para enviar um novo convite.
      </p>
    );
  }

  return (
    <SetPasswordAndRedirect
      submitLabel="Criar conta"
      submitLabelPending="Criando conta…"
      successMessage="Conta criada com sucesso. Redirecionando para o SnowQuote…"
      redirectTo="/orcamentos"
    />
  );
}
