"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import { toast } from "sonner";

import { ErrorState } from "@/components/error-state";
import { LoadingState } from "@/components/loading-state";
import { SectionCard } from "@/components/section-card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  getBrandingSettingsAction,
  updateBrandingSettingsAction,
  uploadInstitutionalLogoAction,
} from "@/features/branding/actions/branding-actions";

const ACCEPTED_TYPES = ["image/png", "image/jpeg", "image/jpg", "image/webp"];
const MAX_SIZE_BYTES = 5 * 1024 * 1024;

/**
 * Tela de identidade visual (M8): dados institucionais (nome, rodapé) e logo
 * institucional usada no .pptx. O preview da logo vem de uma URL assinada
 * temporária (bucket privado), nunca de um link público permanente. Os
 * dados são carregados no client (como `QuoteListScreen`), não no Server
 * Component da página: evita que o Next (Cache Components) tente
 * pré-renderizar uma página que depende de autenticação/cookies de sessão.
 */
export function BrandingSettingsScreen() {
  const logoInputId = useId();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [companyName, setCompanyName] = useState("");
  const [institutionalFooter, setInstitutionalFooter] = useState("");
  const [isSavingSettings, setIsSavingSettings] = useState(false);

  const [logoPreviewUrl, setLogoPreviewUrl] = useState<string | null>(null);
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);
  const [logoError, setLogoError] = useState<string | null>(null);

  const loadSettings = useCallback(async () => {
    setIsLoading(true);
    setLoadError(null);
    try {
      const { settings, logoPreviewUrl: previewUrl } = await getBrandingSettingsAction();
      setCompanyName(settings.companyName);
      setInstitutionalFooter(settings.institutionalFooter);
      setLogoPreviewUrl(previewUrl);
    } catch {
      setLoadError("Não foi possível carregar a identidade visual.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    const timeout = setTimeout(() => {
      void loadSettings();
    }, 0);
    return () => clearTimeout(timeout);
  }, [loadSettings]);

  async function handleSaveSettings() {
    setIsSavingSettings(true);
    try {
      await updateBrandingSettingsAction({ companyName, institutionalFooter });
      toast.success("Configurações salvas com sucesso.");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Não foi possível salvar as configurações.",
      );
    } finally {
      setIsSavingSettings(false);
    }
  }

  async function handleLogoSelect(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!ACCEPTED_TYPES.includes(file.type)) {
      setLogoError("Formato inválido. Envie uma imagem PNG, JPG ou WEBP.");
      event.target.value = "";
      return;
    }

    if (file.size > MAX_SIZE_BYTES) {
      setLogoError("Arquivo muito grande. O tamanho máximo é 5 MB.");
      event.target.value = "";
      return;
    }

    setLogoError(null);
    setIsUploadingLogo(true);

    try {
      const formData = new FormData();
      formData.set("file", file);
      await uploadInstitutionalLogoAction(formData);
      const { logoPreviewUrl: refreshedPreviewUrl } = await getBrandingSettingsAction();
      setLogoPreviewUrl(refreshedPreviewUrl);
      toast.success("Logo institucional atualizada.");
    } catch (error) {
      setLogoError(error instanceof Error ? error.message : "Não foi possível enviar o arquivo.");
    } finally {
      setIsUploadingLogo(false);
      event.target.value = "";
    }
  }

  return (
    <SectionCard
      number={3}
      title="Identidade visual"
      description="Gestão de logo institucional e textos de marca usados no .pptx gerado."
    >
      {isLoading ? <LoadingState label="Carregando identidade visual…" /> : null}

      {!isLoading && loadError ? (
        <ErrorState description={loadError} onRetry={() => void loadSettings()} />
      ) : null}

      {!isLoading && !loadError ? (
        <>
          <div className="snow-grid-2">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="branding-company-name">Nome da empresa</Label>
              <Input
                id="branding-company-name"
                value={companyName}
                onChange={(event) => setCompanyName(event.target.value)}
              />
            </div>

            <div className="flex flex-col gap-1.5 sm:col-span-2">
              <Label htmlFor="branding-footer">Texto do rodapé institucional</Label>
              <Textarea
                id="branding-footer"
                value={institutionalFooter}
                onChange={(event) => setInstitutionalFooter(event.target.value)}
                className="min-h-24"
              />
            </div>
          </div>

          <div>
            <Button
              type="button"
              variant="snow-generate"
              size="generate"
              disabled={isSavingSettings || !companyName.trim() || !institutionalFooter.trim()}
              onClick={() => void handleSaveSettings()}
            >
              {isSavingSettings ? "Salvando…" : "Salvar configurações"}
            </Button>
          </div>

          <div className="border-border border-t pt-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor={logoInputId}>Logo institucional</Label>
              <p className="text-muted-foreground text-xs">
                Usada no rodapé institucional do .pptx gerado. PNG, JPG ou WEBP, até 5 MB.
              </p>

              <div className="mt-2 flex flex-col items-start gap-3 sm:flex-row sm:items-center">
                <div className="border-snow-input-border flex size-20 shrink-0 items-center justify-center rounded-[9px] border bg-white p-2">
                  {logoPreviewUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element -- preview via URL assinada do Storage
                    <img
                      src={logoPreviewUrl}
                      alt="Pré-visualização da logo institucional"
                      className="size-full object-contain"
                    />
                  ) : (
                    <span className="text-muted-foreground text-center text-[10px]">Sem logo</span>
                  )}
                </div>

                <div className="flex flex-col gap-1.5">
                  <input
                    ref={fileInputRef}
                    id={logoInputId}
                    type="file"
                    accept={ACCEPTED_TYPES.join(",")}
                    onChange={handleLogoSelect}
                    disabled={isUploadingLogo}
                    className="rounded-snow-input border-input file:text-foreground text-muted-foreground w-full border bg-white px-2.5 py-1.5 text-sm file:mr-2 file:rounded-[6px] file:border-0 file:bg-transparent file:text-sm file:font-medium disabled:cursor-not-allowed disabled:opacity-50"
                  />
                  {isUploadingLogo ? (
                    <p className="text-muted-foreground text-xs">Enviando…</p>
                  ) : null}
                  {logoError ? (
                    <p className="text-destructive text-xs" role="alert">
                      {logoError}
                    </p>
                  ) : null}
                  {!logoPreviewUrl && !isUploadingLogo ? (
                    <Alert variant="warning" className="mt-1">
                      <AlertTitle>Nenhuma logo enviada ainda</AlertTitle>
                      <AlertDescription>
                        Enquanto nenhuma logo for enviada, o .pptx gerado usará uma logo padrão
                        (fallback).
                      </AlertDescription>
                    </Alert>
                  ) : null}
                </div>
              </div>
            </div>
          </div>
        </>
      ) : null}
    </SectionCard>
  );
}
