"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { LoadingState } from "@/components/loading-state";
import { SectionCard } from "@/components/section-card";
import { Button } from "@/components/ui/button";
import { getQuoteAction, removeQuoteAction } from "@/features/quotes/actions/quote-actions";
import { CruiseQuoteForm } from "@/features/quotes/components/CruiseQuoteForm";
import { QuoteForm } from "@/features/quotes/components/QuoteForm";
import type { ProductType } from "@/features/prompts/schemas/product-type.schema";

interface NewQuoteContentProps {
  /** `?id=<id>` (rascunho em andamento) ou `?duplicar=<id>` (editar/duplicar). */
  quoteId?: string;
  /** `true` quando `quoteId` veio de `?duplicar=` — edição intencional de um orçamento existente, sem opção de trocar o tipo. */
  isDuplicating?: boolean;
}

/**
 * Decide qual formulário renderizar (`QuoteForm` terrestre ou
 * `CruiseQuoteForm`, M11) a partir do tipo de produto do orçamento:
 * - Com `quoteId` vindo de `?duplicar=` (edição intencional de um
 *   orçamento existente): carrega o registro e renderiza o formulário
 *   correspondente, sem opção de trocar o tipo.
 * - Com `quoteId` vindo de `?id=` (rascunho criado pelo autosave desta
 *   mesma visita): mesma coisa, mas com um botão "Trocar tipo de
 *   orçamento" — descarta o rascunho e volta ao seletor, já que o usuário
 *   pode ter escolhido o tipo errado e não há como "converter" um
 *   orçamento entre tipos (campos completamente diferentes).
 * - Sem `quoteId` (criação nova): mostra o seletor "Terrestre"/"Cruzeiro"
 *   antes de montar o formulário correspondente.
 */
export function NewQuoteContent({ quoteId, isDuplicating }: NewQuoteContentProps) {
  const router = useRouter();
  const [resolvedType, setResolvedType] = useState<ProductType | null>(null);
  const [isLoading, setIsLoading] = useState(Boolean(quoteId));
  const [isSwitching, setIsSwitching] = useState(false);

  useEffect(() => {
    if (!quoteId) return;

    let isActive = true;
    getQuoteAction(quoteId)
      .then((record) => {
        if (!isActive) return;
        setResolvedType(record?.form.productType ?? null);
      })
      .catch(() => {
        if (isActive) setResolvedType(null);
      })
      .finally(() => {
        if (isActive) setIsLoading(false);
      });

    return () => {
      isActive = false;
    };
  }, [quoteId]);

  async function handleSwitchType() {
    if (!quoteId || isSwitching) return;
    setIsSwitching(true);
    try {
      await removeQuoteAction(quoteId);
    } catch {
      // Rascunho pode nunca ter sido persistido (autosave ainda não
      // disparou) — seguir para o seletor de qualquer forma é seguro.
    } finally {
      router.replace("/orcamentos/novo", { scroll: false });
      setResolvedType(null);
      setIsSwitching(false);
    }
  }

  if (isLoading) {
    return <LoadingState label="Carregando orçamento…" />;
  }

  if (quoteId) {
    // `resolvedType` nulo (orçamento não encontrado) cai no formulário
    // terrestre por padrão — o próprio `QuoteForm` trata "não encontrado"
    // com um toast e inicia um rascunho novo.
    const form =
      resolvedType === "cruzeiro" ? (
        <CruiseQuoteForm quoteId={quoteId} />
      ) : (
        <QuoteForm quoteId={quoteId} />
      );

    if (isDuplicating) return form;

    return (
      <SwitchTypeBar label={isSwitching ? "Trocando…" : "Trocar tipo de orçamento"} disabled={isSwitching} onSwitch={() => void handleSwitchType()}>
        {form}
      </SwitchTypeBar>
    );
  }

  if (!resolvedType) {
    return <ProductTypeSelector onSelect={setResolvedType} />;
  }

  // Tipo escolhido, mas ainda sem `?id=` na URL: o rascunho existe só no
  // client (gerado pelo próprio form) até o primeiro autosave confirmar.
  // Mesmo botão de troca, sem nada para excluir no banco ainda.
  return (
    <SwitchTypeBar label="Trocar tipo de orçamento" onSwitch={() => setResolvedType(null)}>
      {resolvedType === "cruzeiro" ? <CruiseQuoteForm /> : <QuoteForm />}
    </SwitchTypeBar>
  );
}

interface SwitchTypeBarProps {
  label: string;
  disabled?: boolean;
  onSwitch: () => void;
  children: React.ReactNode;
}

function SwitchTypeBar({ label, disabled, onSwitch, children }: SwitchTypeBarProps) {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex justify-end">
        <Button type="button" variant="snow-secondary" size="sm" disabled={disabled} onClick={onSwitch}>
          {label}
        </Button>
      </div>
      {children}
    </div>
  );
}

interface ProductTypeSelectorProps {
  onSelect: (type: ProductType) => void;
}

function ProductTypeSelector({ onSelect }: ProductTypeSelectorProps) {
  return (
    <SectionCard number="01" title="Tipo de orçamento" description="Escolha o tipo de produto para começar.">
      <div className="flex flex-wrap gap-3">
        <Button type="button" variant="snow-generate" size="generate" onClick={() => onSelect("terrestre")}>
          Terrestre
        </Button>
        <Button type="button" variant="snow-secondary" onClick={() => onSelect("cruzeiro")}>
          Cruzeiro
        </Button>
      </div>
    </SectionCard>
  );
}
