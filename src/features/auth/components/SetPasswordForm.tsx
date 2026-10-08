"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm } from "react-hook-form";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FormFieldError } from "@/features/quotes/components/FormFieldError";
import { setPasswordSchema, type SetPasswordValues } from "@/features/auth/schemas/password.schema";
import { createClient } from "@/lib/supabase/client";

interface SetPasswordFormProps {
  /** Texto do botão de confirmação (varia entre "Criar conta", "Redefinir senha", "Salvar nova senha"). */
  submitLabel: string;
  submitLabelPending: string;
  onSuccess: () => void;
}

/**
 * Formulário de definir/trocar senha, reutilizado por `/convite` (primeiro
 * acesso), `/redefinir-senha` (recuperação) e "Minha conta" (troca
 * voluntária). Em todos os três casos a sessão já está ativa no browser
 * (estabelecida pelo link de callback do Supabase ou pelo login normal) —
 * por isso roda inteiramente no client via `supabase.auth.updateUser`, sem
 * Server Action: o token de sessão fica só no client do navegador.
 */
export function SetPasswordForm({ submitLabel, submitLabelPending, onSuccess }: SetPasswordFormProps) {
  const [authError, setAuthError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<SetPasswordValues>({
    resolver: zodResolver(setPasswordSchema),
    defaultValues: { password: "", confirmPassword: "" },
  });

  async function onSubmit(values: SetPasswordValues) {
    setAuthError(null);
    const supabase = createClient();
    const { error } = await supabase.auth.updateUser({ password: values.password });
    if (error) {
      setAuthError("Não foi possível salvar a nova senha. Tente novamente.");
      return;
    }
    onSuccess();
  }

  function onInvalid() {
    setAuthError("Revise os campos destacados abaixo.");
  }

  return (
    <form
      onSubmit={handleSubmit(onSubmit, onInvalid)}
      className="flex flex-col gap-4"
      noValidate
      aria-describedby={authError ? "set-password-error" : undefined}
    >
      {authError ? (
        <p id="set-password-error" role="alert" className="text-destructive text-sm">
          {authError}
        </p>
      ) : null}

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="password">Nova senha</Label>
        <Input
          id="password"
          type="password"
          autoComplete="new-password"
          aria-invalid={Boolean(errors.password)}
          {...register("password")}
        />
        <FormFieldError message={errors.password?.message} />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="confirmPassword">Confirme a nova senha</Label>
        <Input
          id="confirmPassword"
          type="password"
          autoComplete="new-password"
          aria-invalid={Boolean(errors.confirmPassword)}
          {...register("confirmPassword")}
        />
        <FormFieldError message={errors.confirmPassword?.message} />
      </div>

      <Button type="submit" variant="default" size="lg" disabled={isSubmitting} className="mt-2">
        {isSubmitting ? submitLabelPending : submitLabel}
      </Button>
    </form>
  );
}
