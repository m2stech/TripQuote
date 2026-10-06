import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

import type { Database } from "@/lib/supabase/types";

const PROTECTED_PREFIXES = ["/orcamentos", "/admin"];
const ADMIN_ONLY_PREFIX = "/admin";

/**
 * Renova a sessão Supabase a cada request e protege as rotas autenticadas
 * `(app)` (`/orcamentos`) e `admin`. Consultores recebem redirect ao tentar
 * acessar `/admin`; não autenticados são enviados para `/login`.
 */
export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options);
          });
        },
      },
    },
  );

  const { data: userData } = await supabase.auth.getUser();
  const user = userData.user;
  const pathname = request.nextUrl.pathname;

  const isProtected = PROTECTED_PREFIXES.some((prefix) => pathname.startsWith(prefix));

  if (isProtected && !user) {
    const redirectUrl = new URL("/login", request.url);
    redirectUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(redirectUrl);
  }

  if (isProtected && user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("role, active")
      .eq("id", user.id)
      .single();

    // Conta desativada pelo admin: a RLS já bloqueia o acesso aos dados,
    // mas aqui evitamos uma sessão "logada" que só encontra listas vazias.
    if (!profile?.active) {
      await supabase.auth.signOut();
      const redirectUrl = new URL("/login", request.url);
      redirectUrl.searchParams.set("next", pathname);
      return NextResponse.redirect(redirectUrl);
    }

    if (pathname.startsWith(ADMIN_ONLY_PREFIX) && profile.role !== "admin") {
      return NextResponse.redirect(new URL("/orcamentos", request.url));
    }
  }

  return response;
}
