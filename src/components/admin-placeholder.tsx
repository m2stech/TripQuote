import { SectionCard } from "@/components/section-card";

interface AdminPlaceholderProps {
  title: string;
  description: string;
  milestone: string;
}

/**
 * Placeholder padrão das telas admin (esqueleto do M3). A implementação
 * completa de cada área chega no M8 (ver docs/PLAN.md).
 */
export function AdminPlaceholder({ title, description, milestone }: AdminPlaceholderProps) {
  return (
    <SectionCard number="•" title={title} description={description}>
      <p className="text-muted-foreground text-sm">
        Esta tela ainda não foi implementada. A funcionalidade completa chega em {milestone}.
      </p>
    </SectionCard>
  );
}
