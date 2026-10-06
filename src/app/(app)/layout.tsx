import { Suspense } from "react";

import { AppNav } from "@/components/app-nav";

/**
 * Layout da área autenticada: navegação fixa no topo seguindo o tema SNOW.
 * A proteção de rota é feita pelo middleware (`src/middleware.ts`). O
 * `Suspense` é necessário porque `AppNav` usa `usePathname()` (valor só
 * disponível em runtime, não pode ser pré-renderizado estaticamente).
 */
export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-background flex min-h-screen flex-col">
      <Suspense fallback={null}>
        <AppNav />
      </Suspense>
      <div className="flex-1">{children}</div>
    </div>
  );
}
