import { z } from "zod";

/**
 * Tipo de produto do orçamento (M11: Cruzeiro ao lado do terrestre
 * existente). Cada tipo tem sua própria linha de versões de prompt — ver
 * `prompt_versions.product_type` (migration `..._cruise_product_type.sql`).
 *
 * Sem `server-only`: é só a FORMA do dado (enum + rótulos pt-BR), não o
 * conteúdo do prompt em si — consumido por telas client (ex.: badge de tipo
 * na listagem de orçamentos, seletor de tipo em `/orcamentos/novo`). Vive
 * separado de `prompt-version.schema.ts` (que é `server-only`, pois lida
 * com o texto do prompt) para que importá-lo de um Client Component nunca
 * quebre o build — mesmo motivo de `generation-output.schema.ts` não ter
 * `server-only`.
 */
export const productTypeValues = ["terrestre", "cruzeiro"] as const;

export const productTypeSchema = z.enum(productTypeValues);

export type ProductType = z.infer<typeof productTypeSchema>;

export const PRODUCT_TYPE_LABELS: Record<ProductType, string> = {
  terrestre: "Terrestre",
  cruzeiro: "Cruzeiro",
};
