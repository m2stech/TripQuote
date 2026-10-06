import "server-only";

import { z } from "zod";

/**
 * Regras de validação de upload de imagem (logo da agência, imagem de voo).
 * Espelha os limites de UX do `ImageUpload` (client), mas é a validação que
 * de fato decide — nunca confiar apenas na checagem feita no browser.
 */
export const ACCEPTED_IMAGE_MIME_TYPES = ["image/png", "image/jpeg", "image/webp"] as const;

export const MAX_IMAGE_SIZE_BYTES = 5 * 1024 * 1024;

export const imageUploadSchema = z.object({
  mimeType: z.enum(ACCEPTED_IMAGE_MIME_TYPES, {
    error: "Formato inválido. Envie uma imagem PNG, JPG ou WEBP.",
  }),
  sizeBytes: z
    .number()
    .positive()
    .max(MAX_IMAGE_SIZE_BYTES, "Arquivo muito grande. O tamanho máximo é 5 MB."),
});
