import { AdminNav } from "@/components/admin-nav";
import { AppNav } from "@/components/app-nav";
import { Hero } from "@/components/hero";

/**
 * Layout da área admin (esqueleto do M3). A checagem de papel (admin vs
 * consultor) no servidor é implementada no M4/M8; por ora é apenas
 * navegação e estrutura.
 */
export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-background flex min-h-screen flex-col">
      <AppNav />
      <main className="min-h-full pb-16">
        <div className="snow-container flex flex-col gap-8 px-4 pt-6 sm:px-6">
          <Hero title="Administração" subtitle="Gestão de usuários, prompts, identidade visual e consumo." />
          <AdminNav />
          {children}
        </div>
      </main>
    </div>
  );
}
