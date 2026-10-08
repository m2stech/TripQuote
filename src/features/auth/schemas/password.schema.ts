import { z } from "zod";

export const requestPasswordResetSchema = z.object({
  email: z.string().trim().min(1, "Informe o e-mail.").email("Informe um e-mail válido."),
});

export type RequestPasswordResetValues = z.infer<typeof requestPasswordResetSchema>;

/** Usado tanto para definir a senha no primeiro acesso (convite) quanto na redefinição/troca. */
export const setPasswordSchema = z
  .object({
    password: z.string().min(6, "A senha deve ter ao menos 6 caracteres."),
    confirmPassword: z.string().min(1, "Confirme a senha."),
  })
  .refine((values) => values.password === values.confirmPassword, {
    message: "As senhas não coincidem.",
    path: ["confirmPassword"],
  });

export type SetPasswordValues = z.infer<typeof setPasswordSchema>;
