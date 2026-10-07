"use client";

import { useEffect, useRef } from "react";
import type { FieldValues, UseFormWatch } from "react-hook-form";

import { updateQuoteAction } from "@/features/quotes/actions/quote-actions";
import type { QuoteDraftInput } from "@/features/quotes/schemas/quote-form.schema";

const DEBOUNCE_MS = 800;

/**
 * Autosave do rascunho do formulário de orçamento no banco (M5), substituindo
 * o rascunho em `localStorage` do M2. Salva via `updateQuoteAction` com
 * debounce enquanto o usuário preenche o formulário. A linha em `quotes` só
 * passa a existir no banco no primeiro save bem-sucedido — `onFirstSave` é
 * chamado nesse momento (uma única vez) para o formulário gravar o id na URL.
 *
 * `updateQuoteAction` valida o payload com Zod (`quoteDraftSchema`); o cast
 * aqui é só estrutural, entre o tipo de entrada do form (`QuoteFormInput`) e
 * o do rascunho (`QuoteDraftInput`, com todos os campos opcionais).
 */
export function useQuoteAutosave<TFieldValues extends FieldValues>(
  quoteId: string | null,
  watch: UseFormWatch<TFieldValues>,
  onFirstSave?: () => void,
) {
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Ignora o primeiro disparo do `watch`, que corresponde à reidratação
  // inicial do form (`reset()` ao carregar um rascunho existente), não a uma
  // edição do usuário — sem isso, carregar a tela já dispararia um autosave.
  const isFirstCallbackRef = useRef(true);

  useEffect(() => {
    isFirstCallbackRef.current = true;
  }, [quoteId]);

  useEffect(() => {
    if (!quoteId) return;

    const subscription = watch((values) => {
      if (isFirstCallbackRef.current) {
        isFirstCallbackRef.current = false;
        return;
      }

      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      timeoutRef.current = setTimeout(() => {
        void updateQuoteAction(quoteId, values as QuoteDraftInput)
          .then(() => onFirstSave?.())
          .catch(() => {
            // Falha de autosave é silenciosa: o usuário ainda pode submeter
            // o formulário manualmente, que tenta salvar novamente.
          });
      }, DEBOUNCE_MS);
    });

    return () => {
      subscription.unsubscribe();
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [quoteId, watch, onFirstSave]);
}
