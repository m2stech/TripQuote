"use client";

import { useId, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import {
  removeQuoteAttachmentAction,
  uploadQuoteAttachmentAction,
} from "@/features/quotes/actions/attachment-actions";
import type { UploadedAttachment } from "@/features/quotes/schemas/quote-form.schema";

interface ImageUploadProps {
  label: string;
  helperText?: string;
  value: UploadedAttachment | null;
  previewUrl?: string | null;
  onChange: (value: UploadedAttachment | null, previewUrl: string | null) => void;
  /** Orçamento (rascunho) ao qual o anexo pertence; define o path no Storage. */
  quoteId: string | null;
  kind: "agency_logo" | "flight_image";
  disabled?: boolean;
  className?: string;
}

const ACCEPTED_TYPES = ["image/png", "image/jpeg", "image/jpg", "image/webp"];
const MAX_SIZE_BYTES = 5 * 1024 * 1024;

/**
 * Upload de imagem com preview, usado para a logo da agência e para a
 * imagem de voo. O arquivo é enviado via Server Action, normalizado com
 * Sharp e salvo no Storage (buckets privados); apenas uma URL assinada
 * temporária chega ao client para o preview. Validação de tipo e tamanho
 * aqui é só UX — a validação forte roda no servidor (ver `lib/validation/image-upload`).
 */
export function ImageUpload({
  label,
  helperText,
  value,
  previewUrl,
  onChange,
  quoteId,
  kind,
  disabled,
  className,
}: ImageUploadProps) {
  const inputId = useId();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  async function handleFileSelect(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!quoteId) {
      setError("Aguarde o rascunho terminar de ser criado e tente novamente.");
      event.target.value = "";
      return;
    }

    if (!ACCEPTED_TYPES.includes(file.type)) {
      setError("Formato inválido. Envie uma imagem PNG, JPG ou WEBP.");
      event.target.value = "";
      return;
    }

    if (file.size > MAX_SIZE_BYTES) {
      setError("Arquivo muito grande. O tamanho máximo é 5 MB.");
      event.target.value = "";
      return;
    }

    setError(null);
    setIsUploading(true);

    try {
      const formData = new FormData();
      formData.set("file", file);
      const result = await uploadQuoteAttachmentAction(quoteId, kind, formData);
      onChange(result.attachment, result.previewUrl);
    } catch {
      setError("Não foi possível enviar o arquivo. Tente novamente.");
    } finally {
      setIsUploading(false);
      event.target.value = "";
    }
  }

  async function handleRemove() {
    if (value) {
      await removeQuoteAttachmentAction(kind, value.storagePath);
    }
    onChange(null, null);
    setError(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <Label htmlFor={inputId}>{label}</Label>
      {helperText ? <p className="text-muted-foreground text-xs">{helperText}</p> : null}

      {value ? (
        <div className="border-snow-input-border flex items-center gap-3 rounded-[9px] border p-2">
          {previewUrl ? (
            // eslint-disable-next-line @next/next/no-img-element -- preview via URL assinada do Storage, sem otimização necessária
            <img
              src={previewUrl}
              alt={`Pré-visualização de ${value.fileName}`}
              className="size-12 shrink-0 rounded-[6px] object-contain"
            />
          ) : null}
          <span className="text-foreground min-w-0 flex-1 truncate text-sm">{value.fileName}</span>
          <Button
            type="button"
            variant="snow-remove"
            size="sm"
            onClick={handleRemove}
            disabled={disabled}
          >
            Remover
          </Button>
        </div>
      ) : (
        <input
          ref={fileInputRef}
          id={inputId}
          type="file"
          accept={ACCEPTED_TYPES.join(",")}
          onChange={handleFileSelect}
          disabled={disabled || isUploading || !quoteId}
          className="rounded-snow-input border-input file:text-foreground text-muted-foreground w-full border bg-white px-2.5 py-1.5 text-sm file:mr-2 file:rounded-[6px] file:border-0 file:bg-transparent file:text-sm file:font-medium disabled:cursor-not-allowed disabled:opacity-50"
        />
      )}

      {isUploading ? <p className="text-muted-foreground text-xs">Enviando…</p> : null}

      {error ? (
        <p className="text-destructive text-xs" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
