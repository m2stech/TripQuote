"use server";

import { createClient } from "@/lib/supabase/server";
import { loginSchema } from "@/features/auth/schemas/login.schema";

export interface LoginResult {
  error?: string;
}

/**
 * Autentica via Supabase Auth (e-mail/senha). O redirect pós-login é feito
 * pelo client após receber `{ error: undefined }`, para poder respeitar o
 * parâmetro `next` da URL.
 */
export async function login(values: unknown): Promise<LoginResult> {
  const parsed = loginSchema.safeParse(values);
  if (!parsed.success) {
    return { error: "Dados de login inválidos." };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({
    email: parsed.data.email,
    password: parsed.data.password,
  });

  if (error) {
    return { error: "E-mail ou senha inválidos." };
  }

  return {};
}
