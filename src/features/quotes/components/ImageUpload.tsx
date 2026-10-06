"use client";

import { useId, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

export interface UploadedImage {
  fileName: string;
  dataUrl: string;
}

interface ImageUploadProps {
  label: string;
  helperText?: string;
  value: UploadedImage | null;
  onChange: (value: UploadedImage | null) => void;
  disabled?: boolean;
  className?: string;
}

const ACCEPTED_TYPES = ["image/png", "image/jpeg", "image/jpg", "image/webp"];
const MAX_SIZE_BYTES = 5 * 1024 * 1024;

/**
 * Upload de imagem com preview, usado para a logo da agência e para a
 * imagem de voo. Converte o arquivo para dataURL no client; o envio real ao
 * backend/storage será implementado no M5. Validação de tipo e tamanho aqui
 * é apenas UX — a validação forte (Sharp) acontece no servidor.
 */
export function ImageUpload({
  label,
  helperText,
  value,
  onChange,
  disabled,
  className,
}: ImageUploadProps) {
  const inputId = useId();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);

  function handleFileSelect(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

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

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        onChange({ fileName: file.name, dataUrl: reader.result });
      }
    };
    reader.onerror = () => {
      setError("Não foi possível ler o arquivo. Tente novamente.");
    };
    reader.readAsDataURL(file);
  }

  function handleRemove() {
    onChange(null);
    setError(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <Label htmlFor={inputId}>{label}</Label>
      {helperText ? <p className="text-muted-foreground text-xs">{helperText}</p> : null}

      {value ? (
        <div className="border-snow-input-border flex items-center gap-3 rounded-[9px] border p-2">
          {/* eslint-disable-next-line @next/next/no-img-element -- preview local de dataURL, sem otimização necessária */}
          <img
            src={value.dataUrl}
            alt={`Pré-visualização de ${value.fileName}`}
            className="size-12 shrink-0 rounded-[6px] object-contain"
          />
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
          disabled={disabled}
          className="rounded-snow-input border-input file:text-foreground text-muted-foreground w-full border bg-white px-2.5 py-1.5 text-sm file:mr-2 file:rounded-[6px] file:border-0 file:bg-transparent file:text-sm file:font-medium disabled:cursor-not-allowed disabled:opacity-50"
        />
      )}

      {error ? (
        <p className="text-destructive text-xs" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
