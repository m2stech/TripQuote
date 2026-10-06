"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FormFieldError } from "@/features/quotes/components/FormFieldError";
import { writeMockSession } from "@/features/auth/hooks/useMockSession";
import { loginSchema, type LoginValues } from "@/features/auth/schemas/login.schema";

/**
 * Formulário de login mockado (M3): valida e-mail/senha no client e cria uma
 * sessão local fictícia. A autenticação real (Supabase Auth) chega no M4,
 * mantendo esta mesma tela.
 */
export function LoginForm() {
  const router = useRouter();
  const [authError, setAuthError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  async function onSubmit(values: LoginValues) {
    setAuthError(null);
    // Simula latência de rede da autenticação real.
    await new Promise((resolve) => setTimeout(resolve, 400));
    writeMockSession({ email: values.email });
    router.push("/orcamentos");
  }

  function onInvalid() {
    setAuthError("Revise os campos destacados abaixo.");
  }

  return (
    <form
      onSubmit={handleSubmit(onSubmit, onInvalid)}
      className="flex flex-col gap-4"
      noValidate
      aria-describedby={authError ? "login-error" : undefined}
    >
      {authError ? (
        <p id="login-error" role="alert" className="text-destructive text-sm">
          {authError}
        </p>
      ) : null}

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

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="password">Senha</Label>
        <Input
          id="password"
          type="password"
          autoComplete="current-password"
          aria-invalid={Boolean(errors.password)}
          {...register("password")}
        />
        <FormFieldError message={errors.password?.message} />
      </div>

      <Button type="submit" variant="default" size="lg" disabled={isSubmitting} className="mt-2">
        {isSubmitting ? "Entrando…" : "Entrar"}
      </Button>
    </form>
  );
}
