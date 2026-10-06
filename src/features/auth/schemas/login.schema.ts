import { z } from "zod";

/**
 * Schema do formulário de login (M3, mockado). A autenticação real com
 * Supabase Auth é implementada no M4; este schema já segue o formato
 * esperado (e-mail/senha) para ser reaproveitado então.
 */
export const loginSchema = z.object({
  email: z.string().trim().min(1, "Informe o e-mail.").email("Informe um e-mail válido."),
  password: z.string().min(6, "A senha deve ter ao menos 6 caracteres."),
});

export type LoginValues = z.infer<typeof loginSchema>;
