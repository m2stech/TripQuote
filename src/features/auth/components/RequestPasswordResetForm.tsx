"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm } from "react-hook-form";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FormFieldError } from "@/features/quotes/components/FormFieldError";
import { requestPasswordResetAction } from "@/features/auth/actions/request-password-reset";
import {
  requestPasswordResetSchema,
  type RequestPasswordResetValues,
} from "@/features/auth/schemas/password.schema";

/**
 * Formulário "Esqueci minha senha": sempre mostra a mesma mensagem de
 * sucesso, mesmo se o e-mail não tiver conta — evita revelar quais e-mails
 * estão cadastrados (mesma prática de `requestPasswordResetAction`).
 */
export function RequestPasswordResetForm() {
  const [isSent, setIsSent] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<RequestPasswordResetValues>({
    resolver: zodResolver(requestPasswordResetSchema),
    defaultValues: { email: "" },
  });

  async function onSubmit(values: RequestPasswordResetValues) {
    await requestPasswordResetAction(values);
    setIsSent(true);
  }

  if (isSent) {
    return (
      <p className="text-foreground text-sm">
        Se houver uma conta com esse e-mail, você vai receber um link para redefinir sua senha em
        instantes.
      </p>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4" noValidate>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="email">E-mail</Label>
        <Input
          id="email"
          type="email"
          autoComplete="email"
          placeholder="consultor@agencia.com.br"
          aria-invalid={Boolean(errors.email)}
          {...register("email")}
        />
        <FormFieldError message={errors.email?.message} />
      </div>

      <Button type="submit" variant="default" size="lg" disabled={isSubmitting} className="mt-2">
        {isSubmitting ? "Enviando…" : "Enviar link de recuperação"}
      </Button>
    </form>
  );
}
