"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { SetPasswordForm } from "@/features/auth/components/SetPasswordForm";

interface SetPasswordAndRedirectProps {
  submitLabel: string;
  submitLabelPending: string;
  successMessage: string;
  redirectTo: string;
}

/**
 * Wrapper client de `SetPasswordForm` para as páginas de callback
 * (`/convite`, `/redefinir-senha`): a checagem de sessão já roda no Server
 * Component da página (cookies), então este componente só cuida do
 * pós-sucesso (mensagem + redirect), que precisa de `useRouter` (client).
 */
export function SetPasswordAndRedirect({
  submitLabel,
  submitLabelPending,
  successMessage,
  redirectTo,
}: SetPasswordAndRedirectProps) {
  const router = useRouter();
  const [isDone, setIsDone] = useState(false);

  if (isDone) {
    return <p className="text-foreground text-sm">{successMessage}</p>;
  }

  return (
    <SetPasswordForm
      submitLabel={submitLabel}
      submitLabelPending={submitLabelPending}
      onSuccess={() => {
        setIsDone(true);
        router.push(redirectTo);
        router.refresh();
      }}
    />
  );
}
