import type { GenerationOutput } from "@/features/quotes/schemas/generation-output.schema";
import type { QuoteDraftValues } from "@/features/quotes/schemas/quote-form.schema";
import type { QuoteRecord, QuoteStatus, QuoteSummary } from "@/features/quotes/schemas/quote.schema";

/** Resultado final de uma geração via IA, gravado pelo orquestrador (M6). */
export type GenerationResult =
  | { status: "done"; aiOutput: GenerationOutput }
  | { status: "error"; errorMessage: string };

/**
 * Filtros de listagem de orçamentos. `period` filtra pela data de início da
 * viagem (`general.startDate`).
 */
export interface QuoteListFilters {
  search?: string;
  status?: QuoteStatus;
  destination?: string;
  periodStart?: string;
  periodEnd?: string;
}

export interface QuoteListResult {
  items: QuoteSummary[];
  total: number;
}

/**
 * Camada de acesso a orçamentos. `InMemoryQuoteRepository` foi a implementação
 * mock usada até o M5 (mantida para testes); `SupabaseQuoteRepository` é a
 * implementação real, usada pelas Server Actions (ver `features/quotes/actions`).
 */
export interface QuoteRepository {
  list(filters?: QuoteListFilters): Promise<QuoteListResult>;
  getById(id: string): Promise<QuoteRecord | null>;
  create(form: QuoteDraftValues, createdBy: string): Promise<QuoteRecord>;
  /**
   * Cria (com o `id` e o conteúdo informados) ou atualiza um rascunho,
   * conforme ele já exista ou não — idempotente por `id` (chamadas
   * concorrentes com o mesmo id nunca duplicam, graças ao conflito de PK no
   * Postgres). Usado pelo autosave e pelo upload de anexo: a linha só passa a
   * existir no banco quando há algo de fato para salvar (ver
   * `useQuoteAutosave`/`uploadQuoteAttachmentAction`), nunca só por visitar
   * a página de novo orçamento.
   */
  upsertDraft(id: string, form: QuoteDraftValues, createdBy: string): Promise<QuoteRecord>;
  /**
   * Garante que existe uma linha com esse `id`, sem alterar o conteúdo se ela
   * já existir — usado pelo upload de anexo, que só precisa satisfazer a FK
   * de `quote_attachments` e nunca deve sobrescrever um rascunho já salvo
   * (ex.: logo enviada depois de outros campos já preenchidos).
   */
  ensureDraftExists(id: string, createdBy: string): Promise<QuoteRecord>;
  update(id: string, form: QuoteDraftValues): Promise<QuoteRecord>;
  duplicate(id: string): Promise<QuoteRecord>;
  remove(id: string): Promise<void>;
  /**
   * Marca o orçamento como `processing`, limpando qualquer erro anterior.
   * Chamado pelo orquestrador (`features/quotes/actions/generation-orchestrator.ts`)
   * antes de disparar a chamada à IA.
   */
  markProcessing(id: string): Promise<void>;
  /**
   * Grava o resultado final de uma geração via IA: `done` com a saída
   * estruturada (`ai_output`), ou `error` com a mensagem genérica pt-BR
   * exibida ao usuário (o detalhe técnico fica só em `generations`/`audit_log`).
   */
  updateGenerationResult(id: string, result: GenerationResult): Promise<QuoteRecord>;
  /**
   * Grava o caminho do .pptx gerado no Storage após a montagem determinística
   * (M7). Separado de `updateGenerationResult`: a montagem do PPTX é uma etapa
   * subsequente e independente da geração via IA — pode falhar sem reverter o
   * `status: "done"` já obtido com sucesso.
   */
  updatePptxStoragePath(id: string, path: string): Promise<QuoteRecord>;
}
