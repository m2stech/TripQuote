"use client";

import { useCallback, useEffect, useRef } from "react";
import type { FieldValues, UseFormWatch } from "react-hook-form";

import type { quoteFormSchema } from "@/features/quotes/schemas/quote-form.schema";
import type { z } from "zod";

/** Tipo de entrada do formulário (ver `QuoteFormInput` em `QuoteForm.tsx`). */
type QuoteDraft = z.input<typeof quoteFormSchema>;

/**
 * Chave de armazenamento do rascunho local do formulário de orçamento.
 */
export const QUOTE_DRAFT_STORAGE_KEY = "tripquote:quote-draft";

const DEBOUNCE_MS = 500;

/**
 * Lê o rascunho salvo em localStorage, se existir e for um JSON válido.
 * Retorna `null` quando não há rascunho ou quando o conteúdo é inválido.
 */
export function readQuoteDraft(): QuoteDraft | null {
  if (typeof window === "undefined") return null;

  try {
    const raw = window.localStorage.getItem(QUOTE_DRAFT_STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as QuoteDraft;
  } catch {
    return null;
  }
}

/**
 * Persiste o estado do formulário de orçamento em localStorage com debounce.
 *
 * Provisório: solução temporária do M2 para não perder dados ao recarregar a
 * página; será substituída pelo autosave no banco (Supabase) no M5.
 */
export function useQuoteDraft<TFieldValues extends FieldValues>(watch: UseFormWatch<TFieldValues>) {
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const subscription = watch((values) => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      timeoutRef.current = setTimeout(() => {
        try {
          window.localStorage.setItem(QUOTE_DRAFT_STORAGE_KEY, JSON.stringify(values));
        } catch {
          // Armazenamento indisponível (ex.: modo privado); ignora silenciosamente.
        }
      }, DEBOUNCE_MS);
    });

    return () => {
      subscription.unsubscribe();
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [watch]);

  const clearDraft = useCallback(() => {
    try {
      window.localStorage.removeItem(QUOTE_DRAFT_STORAGE_KEY);
    } catch {
      // Ignora silenciosamente.
    }
  }, []);

  return { clearDraft };
}
