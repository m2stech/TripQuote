"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

import { EmptyState } from "@/components/empty-state";
import { ErrorState } from "@/components/error-state";
import { LoadingState } from "@/components/loading-state";
import { SectionCard } from "@/components/section-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  listModelPricingAction,
  upsertModelPricingAction,
} from "@/features/usage/actions/model-pricing-actions";
import type { ModelPricingRecord } from "@/features/usage/schemas/model-pricing.schema";

interface DraftPricing {
  model: string;
  inputPerMillionUsd: string;
  outputPerMillionUsd: string;
}

const EMPTY_DRAFT: DraftPricing = { model: "", inputPerMillionUsd: "", outputPerMillionUsd: "" };

/**
 * Preços por modelo (USD por 1M de tokens), editáveis pelo admin — fonte
 * usada pelo cálculo de custo estimado em `generations` (antes hardcoded em
 * `estimate-cost.ts`, M9).
 */
export function ModelPricingSection() {
  const [pricing, setPricing] = useState<ModelPricingRecord[] | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [editingModel, setEditingModel] = useState<string | null>(null);
  const [draft, setDraft] = useState<DraftPricing>(EMPTY_DRAFT);
  const [isSaving, setIsSaving] = useState(false);

  const loadPricing = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await listModelPricingAction();
      setPricing(result);
    } catch {
      setError("Não foi possível carregar os preços por modelo.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    const timeout = setTimeout(() => {
      void loadPricing();
    }, 0);
    return () => clearTimeout(timeout);
  }, [loadPricing]);

  function startEditing(record?: ModelPricingRecord) {
    setEditingModel(record?.model ?? "new");
    setDraft(
      record
        ? {
            model: record.model,
            inputPerMillionUsd: String(record.inputPerMillionUsd),
            outputPerMillionUsd: String(record.outputPerMillionUsd),
          }
        : EMPTY_DRAFT,
    );
  }

  async function handleSave() {
    setIsSaving(true);
    try {
      await upsertModelPricingAction({
        model: draft.model,
        inputPerMillionUsd: Number(draft.inputPerMillionUsd),
        outputPerMillionUsd: Number(draft.outputPerMillionUsd),
      });
      toast.success("Preço salvo com sucesso.");
      setEditingModel(null);
      await loadPricing();
    } catch (saveError) {
      toast.error(saveError instanceof Error ? saveError.message : "Não foi possível salvar o preço.");
    } finally {
      setIsSaving(false);
    }
  }

  const isDraftValid =
    draft.model.trim().length > 0 &&
    Number.isFinite(Number(draft.inputPerMillionUsd)) &&
    Number.isFinite(Number(draft.outputPerMillionUsd));

  return (
    <SectionCard
      number={5}
      title="Preços por modelo"
      description="Preço por 1 milhão de tokens (USD), usado no cálculo do custo estimado de cada geração."
    >
      {editingModel === "new" ? null : (
        <div className="flex justify-end">
          <Button type="button" variant="snow-generate" size="generate" onClick={() => startEditing()}>
            Novo modelo
          </Button>
        </div>
      )}

      {editingModel === "new" ? (
        <PricingForm
          draft={draft}
          setDraft={setDraft}
          isNew
          isSaving={isSaving}
          isValid={isDraftValid}
          onCancel={() => setEditingModel(null)}
          onSave={() => void handleSave()}
        />
      ) : null}

      {isLoading ? <LoadingState label="Carregando preços…" /> : null}

      {!isLoading && error ? <ErrorState description={error} onRetry={() => void loadPricing()} /> : null}

      {!isLoading && !error && pricing && pricing.length === 0 ? (
        <EmptyState
          title="Nenhum preço cadastrado"
          description="Cadastre o preço de cada modelo usado na geração via IA."
        />
      ) : null}

      {!isLoading && !error && pricing && pricing.length > 0 ? (
        <ul className="flex flex-col gap-3">
          {pricing.map((record) =>
            editingModel === record.model ? (
              <li key={record.model}>
                <PricingForm
                  draft={draft}
                  setDraft={setDraft}
                  isSaving={isSaving}
                  isValid={isDraftValid}
                  onCancel={() => setEditingModel(null)}
                  onSave={() => void handleSave()}
                />
              </li>
            ) : (
              <li
                key={record.model}
                className="rounded-snow-card border-border bg-card flex items-center justify-between gap-3 border p-4"
              >
                <div className="flex min-w-0 flex-col gap-1">
                  <p className="text-foreground font-semibold">{record.model}</p>
                  <p className="text-muted-foreground text-sm">
                    Entrada: US$ {record.inputPerMillionUsd.toFixed(4)} / 1M · Saída: US${" "}
                    {record.outputPerMillionUsd.toFixed(4)} / 1M
                  </p>
                </div>
                <Button type="button" variant="outline" size="sm" onClick={() => startEditing(record)}>
                  Editar
                </Button>
              </li>
            ),
          )}
        </ul>
      ) : null}
    </SectionCard>
  );
}

function PricingForm({
  draft,
  setDraft,
  isNew = false,
  isSaving,
  isValid,
  onCancel,
  onSave,
}: {
  draft: DraftPricing;
  setDraft: (draft: DraftPricing) => void;
  isNew?: boolean;
  isSaving: boolean;
  isValid: boolean;
  onCancel: () => void;
  onSave: () => void;
}) {
  return (
    <div className="rounded-snow-card border-border bg-card flex flex-col gap-3 border p-4">
      <div className="snow-grid-2 sm:grid-cols-3">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="pricing-model">Modelo</Label>
          <Input
            id="pricing-model"
            value={draft.model}
            disabled={!isNew}
            placeholder="ex.: gpt-4.1"
            onChange={(event) => setDraft({ ...draft, model: event.target.value })}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="pricing-input">Entrada (US$ / 1M tokens)</Label>
          <Input
            id="pricing-input"
            type="number"
            min="0"
            step="0.0001"
            value={draft.inputPerMillionUsd}
            onChange={(event) => setDraft({ ...draft, inputPerMillionUsd: event.target.value })}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="pricing-output">Saída (US$ / 1M tokens)</Label>
          <Input
            id="pricing-output"
            type="number"
            min="0"
            step="0.0001"
            value={draft.outputPerMillionUsd}
            onChange={(event) => setDraft({ ...draft, outputPerMillionUsd: event.target.value })}
          />
        </div>
      </div>
      <div className="flex justify-end gap-2">
        <Button type="button" variant="snow-secondary" onClick={onCancel}>
          Cancelar
        </Button>
        <Button type="button" variant="snow-generate" disabled={isSaving || !isValid} onClick={onSave}>
          {isSaving ? "Salvando…" : "Salvar"}
        </Button>
      </div>
    </div>
  );
}
