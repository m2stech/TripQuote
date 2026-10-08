import { type EmailOtpType } from "@supabase/supabase-js";
import { redirect } from "next/navigation";
import { type NextRequest } from "next/server";

import { createClient } from "@/lib/supabase/server";

/**
 * Destino dos links de convite e recuperação de senha enviados por e-mail
 * (ver templates aplicados via Management API). Troca o `token_hash` por
 * uma sessão autenticada *no servidor*, gravando cookies de sessão antes de
 * redirecionar — ao contrário do fluxo anterior (hash `#access_token=...`
 * processado no client), que dependia do SDK processar a URL no browser e
 * podia falhar com 422 se o token fosse consumido/expirasse antes da hora
 * (ex. remount em React Strict Mode). Padrão recomendado pelo Supabase para
 * apps Next.js com `@supabase/ssr`.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  const next = searchParams.get("next") ?? "/orcamentos";

  if (!tokenHash || !type) {
    redirect("/login?erro=link-invalido");
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash });
  if (error) {
    redirect("/login?erro=link-invalido");
  }

  redirect(next);
}
