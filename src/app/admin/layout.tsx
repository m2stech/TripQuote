import { Suspense } from "react";

import { AdminNav } from "@/components/admin-nav";
import { AppNav } from "@/components/app-nav";
import { Hero } from "@/components/hero";

/**
 * Layout da área admin. A checagem de papel (admin vs consultor) é feita
 * pelo middleware (`src/middleware.ts`); a gestão completa chega no M8. O
 * `Suspense` é necessário porque `AppNav`/`AdminNav` usam `usePathname()`
 * (valor só disponível em runtime, não pode ser pré-renderizado
 * estaticamente).
 */
export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-background flex min-h-screen flex-col">
      <Suspense fallback={null}>
        <AppNav />
      </Suspense>
      <main className="min-h-full pb-16">
        <div className="snow-container flex flex-col gap-8 px-4 pt-6 sm:px-6">
          <Hero title="Administração" subtitle="Gestão de usuários, prompts, identidade visual e consumo." />
          <Suspense fallback={null}>
            <AdminNav />
          </Suspense>
          {children}
        </div>
      </main>
    </div>
  );
}
