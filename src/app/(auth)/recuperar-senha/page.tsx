import type { Metadata } from "next";
import Link from "next/link";

import { RequestPasswordResetForm } from "@/features/auth/components/RequestPasswordResetForm";

export const metadata: Metadata = {
  title: "Recuperar senha — TripQuote",
};

export default function RequestPasswordResetPage() {
  return (
    <main className="bg-background flex min-h-screen flex-1 items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex flex-col items-center gap-2 text-center">
          <span className="text-snow-navy text-2xl font-bold">TripQuote</span>
          <p className="text-muted-foreground text-sm">
            Informe seu e-mail para receber um link de redefinição de senha.
          </p>
        </div>

        <div className="rounded-snow-card border-border bg-card shadow-snow-card border p-6">
          <RequestPasswordResetForm />
        </div>

        <p className="text-muted-foreground mt-4 text-center text-sm">
          <Link href="/login" className="text-snow-blue hover:underline">
            Voltar para o login
          </Link>
        </p>
      </div>
    </main>
  );
}
