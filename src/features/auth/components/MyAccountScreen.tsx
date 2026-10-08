"use client";

import { toast } from "sonner";

import { SectionCard } from "@/components/section-card";
import { SetPasswordForm } from "@/features/auth/components/SetPasswordForm";

/**
 * Tela "Minha conta": troca de senha pelo próprio usuário autenticado. A
 * sessão já está ativa (login normal), então reaproveita `SetPasswordForm`
 * sem passar por nenhum link de callback.
 */
export function MyAccountScreen() {
  return (
    <SectionCard number={1} title="Minha conta" description="Troque a senha da sua conta SnowQuote.">
      <SetPasswordForm
        submitLabel="Salvar nova senha"
        submitLabelPending="Salvando…"
        onSuccess={() => toast.success("Senha atualizada com sucesso.")}
      />
    </SectionCard>
  );
}
