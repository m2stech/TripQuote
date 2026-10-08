"use server";

import { createClient } from "@/lib/supabase/server";
import { requestPasswordResetSchema } from "@/features/auth/schemas/password.schema";

/**
 * Dispara o e-mail de recuperação de senha do Supabase. Sempre retorna
 * sucesso (mesmo para e-mail inexistente) para não revelar quais e-mails
 * têm conta — prática padrão de "esqueci minha senha".
 *
 * O link do e-mail é montado pelo template customizado (aplicado via
 * Management API) usando `{{ .TokenHash }}` e apontando para o Route
 * Handler `/auth/confirm?...&next=/redefinir-senha`, que troca o token por
 * uma sessão via cookies no servidor antes de redirecionar.
 */
export async function requestPasswordResetAction(values: unknown): Promise<void> {
  const parsed = requestPasswordResetSchema.safeParse(values);
  if (!parsed.success) return;

  const supabase = await createClient();
  await supabase.auth.resetPasswordForEmail(parsed.data.email);
}
