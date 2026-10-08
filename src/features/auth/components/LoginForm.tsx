"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FormFieldError } from "@/features/quotes/components/FormFieldError";
import { login } from "@/features/auth/actions/login";
import { loginSchema, type LoginValues } from "@/features/auth/schemas/login.schema";

/**
 * Formulário de login: autentica via Supabase Auth (Server Action
 * `login`) e navega para a área autenticada, respeitando `?next=`.
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
    const result = await login(values);
    if (result.error) {
      setAuthError(result.error);
      return;
    }
    const next = new URLSearchParams(window.location.search).get("next");
    router.push(next && next.startsWith("/") ? next : "/orcamentos");
    router.refresh();
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
        <div className="flex items-center justify-between">
          <Label htmlFor="password">Senha</Label>
          <Link href="/recuperar-senha" className="text-snow-blue text-sm hover:underline">
            Esqueci minha senha
          </Link>
        </div>
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
