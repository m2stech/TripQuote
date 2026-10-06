import { AppNav } from "@/components/app-nav";

/**
 * Layout da área autenticada (M3): navegação fixa no topo seguindo o tema
 * SNOW. A proteção real de rota (middleware de autenticação) chega no M4;
 * por ora o acesso não é bloqueado no servidor.
 */
export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-background flex min-h-screen flex-col">
      <AppNav />
      <div className="flex-1">{children}</div>
    </div>
  );
}
