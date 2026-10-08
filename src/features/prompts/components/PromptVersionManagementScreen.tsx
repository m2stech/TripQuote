"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

import { EmptyState } from "@/components/empty-state";
import { ErrorState } from "@/components/error-state";
import { LoadingState } from "@/components/loading-state";
import { SectionCard } from "@/components/section-card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  activatePromptVersionAction,
  createPromptVersionAction,
  listPromptVersionsAction,
} from "@/features/prompts/actions/prompt-version-actions";
import type { PromptVersionRecord } from "@/features/prompts/schemas/prompt-version.schema";

const PREVIEW_LENGTH = 220;

function formatDate(isoDate: string): string {
  const date = new Date(isoDate);
  if (Number.isNaN(date.getTime())) return isoDate;
  return date.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/**
 * Tela de versionamento do prompt usado na geração via IA (M8). O conteúdo
 * nunca é exposto ao consultor — só admins acessam esta tela (ver
 * `requireAdmin()` nas Server Actions). A lista é carregada no client (como
 * `QuoteListScreen`), não no Server Component da página: isso evita que o
 * Next (Cache Components) tente pré-renderizar uma página que depende de
 * autenticação/cookies de sessão.
 */
export function PromptVersionManagementScreen() {
  const [versions, setVersions] = useState<PromptVersionRecord[] | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const [previewVersion, setPreviewVersion] = useState<PromptVersionRecord | null>(null);
  const [pendingActivation, setPendingActivation] = useState<PromptVersionRecord | null>(null);
  const [isActivating, setIsActivating] = useState(false);

  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [newContent, setNewContent] = useState("");
  const [activateImmediately, setActivateImmediately] = useState(false);
  const [isCreating, setIsCreating] = useState(false);

  const sortedVersions = versions ? [...versions].sort((a, b) => b.version - a.version) : [];

  const loadVersions = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await listPromptVersionsAction();
      setVersions(result);
    } catch {
      setError("Não foi possível carregar a lista de versões.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  const refreshVersions = useCallback(async () => {
    setIsRefreshing(true);
    try {
      const updated = await listPromptVersionsAction();
      setVersions(updated);
    } catch {
      toast.error("Não foi possível atualizar a lista de versões.");
    } finally {
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    const timeout = setTimeout(() => {
      void loadVersions();
    }, 0);
    return () => clearTimeout(timeout);
  }, [loadVersions]);

  async function handleConfirmActivation() {
    if (!pendingActivation) return;
    setIsActivating(true);
    try {
      await activatePromptVersionAction(pendingActivation.id);
      toast.success(`Versão ${pendingActivation.version} ativada.`);
      setPendingActivation(null);
      await refreshVersions();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível ativar a versão.");
    } finally {
      setIsActivating(false);
    }
  }

  async function handleCreateSubmit() {
    setIsCreating(true);
    try {
      await createPromptVersionAction({ content: newContent, activate: activateImmediately });
      toast.success("Nova versão do prompt criada.");
      setIsCreateDialogOpen(false);
      setNewContent("");
      setActivateImmediately(false);
      await refreshVersions();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível criar a versão.");
    } finally {
      setIsCreating(false);
    }
  }

  return (
    <SectionCard
      number={2}
      title="Prompts"
      description="Editor de prompt com versionamento: nova versão, ativação e histórico."
    >
      <Alert variant="warning">
        <AlertTitle>O prompt nunca é exposto ao consultor</AlertTitle>
        <AlertDescription>
          <p>
            O conteúdo abaixo é usado só no backend para orientar a geração via IA. Ativar uma
            versão diferente afeta imediatamente a próxima geração de todos os consultores.
          </p>
        </AlertDescription>
      </Alert>

      <div className="flex justify-end">
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger
            render={
              <Button variant="snow-generate" size="generate">
                Nova versão
              </Button>
            }
          />
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Nova versão do prompt</DialogTitle>
              <DialogDescription>
                A numeração da versão é definida automaticamente pelo backend.
              </DialogDescription>
            </DialogHeader>

            <div className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="prompt-new-content">Conteúdo</Label>
                <Textarea
                  id="prompt-new-content"
                  value={newContent}
                  onChange={(event) => setNewContent(event.target.value)}
                  className="min-h-64"
                  placeholder="Cole ou escreva o conteúdo completo do prompt…"
                />
              </div>

              <div className="flex items-center gap-2">
                <Checkbox
                  id="prompt-activate-now"
                  checked={activateImmediately}
                  onCheckedChange={(checked) => setActivateImmediately(checked === true)}
                />
                <Label htmlFor="prompt-activate-now">Ativar imediatamente</Label>
              </div>
            </div>

            <DialogFooter>
              <DialogClose render={<Button variant="snow-secondary">Cancelar</Button>} />
              <Button
                type="button"
                variant="snow-generate"
                disabled={isCreating || newContent.trim().length === 0}
                onClick={() => void handleCreateSubmit()}
              >
                {isCreating ? "Salvando…" : "Criar versão"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? <LoadingState label="Carregando versões…" /> : null}

      {!isLoading && error ? (
        <ErrorState description={error} onRetry={() => void loadVersions()} />
      ) : null}

      {!isLoading && !error && sortedVersions.length === 0 ? (
        <EmptyState
          title="Nenhuma versão de prompt cadastrada"
          description="Crie a primeira versão para habilitar a geração via IA."
        />
      ) : null}

      {!isLoading && !error && sortedVersions.length > 0 ? (
        <ul className="flex flex-col gap-3" aria-busy={isRefreshing}>
          {sortedVersions.map((promptVersion) => (
            <li
              key={promptVersion.id}
              className="rounded-snow-card border-border bg-card flex flex-col gap-3 border p-4 sm:flex-row sm:items-start sm:justify-between"
            >
              <div className="flex min-w-0 flex-col gap-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-foreground font-semibold">Versão {promptVersion.version}</p>
                  {promptVersion.isActive ? (
                    <Badge className="bg-snow-blue border-0 text-white">Ativa</Badge>
                  ) : null}
                </div>
                <p className="text-muted-foreground text-xs">
                  Criada em {formatDate(promptVersion.createdAt)}
                </p>
                <p className="text-muted-foreground text-sm">
                  {promptVersion.content.slice(0, PREVIEW_LENGTH)}
                  {promptVersion.content.length > PREVIEW_LENGTH ? "…" : ""}
                </p>
                <Button
                  type="button"
                  variant="link"
                  className="h-auto self-start p-0"
                  onClick={() => setPreviewVersion(promptVersion)}
                >
                  Ver conteúdo completo
                </Button>
              </div>

              {!promptVersion.isActive ? (
                <div className="shrink-0">
                  <Dialog
                    open={pendingActivation?.id === promptVersion.id}
                    onOpenChange={(open) => setPendingActivation(open ? promptVersion : null)}
                  >
                    <DialogTrigger
                      render={
                        <Button type="button" variant="outline" size="sm">
                          Ativar
                        </Button>
                      }
                    />
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Ativar versão {promptVersion.version}</DialogTitle>
                        <DialogDescription>
                          Isso afeta imediatamente a próxima geração de todos os consultores. Deseja
                          continuar?
                        </DialogDescription>
                      </DialogHeader>
                      <DialogFooter>
                        <DialogClose render={<Button variant="snow-secondary">Cancelar</Button>} />
                        <Button
                          type="button"
                          variant="snow-generate"
                          disabled={isActivating}
                          onClick={() => void handleConfirmActivation()}
                        >
                          {isActivating ? "Ativando…" : "Ativar"}
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                </div>
              ) : null}
            </li>
          ))}
        </ul>
      ) : null}

      <Dialog
        open={previewVersion !== null}
        onOpenChange={(open) => !open && setPreviewVersion(null)}
      >
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Conteúdo completo — Versão {previewVersion?.version ?? ""}</DialogTitle>
          </DialogHeader>
          <div className="rounded-snow-input border-input max-h-[60vh] overflow-y-auto border bg-white p-3 text-sm whitespace-pre-wrap">
            {previewVersion?.content}
          </div>
          <DialogFooter>
            <DialogClose render={<Button variant="snow-secondary">Fechar</Button>} />
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </SectionCard>
  );
}
