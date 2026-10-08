import { SetPasswordAndRedirect } from "@/features/auth/components/SetPasswordAndRedirect";
import { createClient } from "@/lib/supabase/server";

/**
 * Isolado em um componente server próprio (e não inline em `page.tsx`) para
 * que o acesso a `cookies()` (via `createClient()`) fique dentro de um
 * `<Suspense>` — sem isso, o Next.js (`cacheComponents: true`) bloqueia o
 * build de produção com "uncached or runtime data during prerendering".
 */
export async function ResetPasswordContent() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();

  if (!data.user) {
    return (
      <p className="text-destructive text-sm" role="alert">
        Link de redefinição inválido ou expirado. Solicite um novo link em &quot;Esqueci minha
        senha&quot;.
      </p>
    );
  }

  return (
    <SetPasswordAndRedirect
      submitLabel="Salvar nova senha"
      submitLabelPending="Salvando…"
      successMessage="Senha redefinida com sucesso. Redirecionando para o SnowQuote…"
      redirectTo="/orcamentos"
    />
  );
}
