import "server-only";

import { fetchExternalImage } from "@/features/pptx/images/fetch-external-image";
import { resolveContainSizing, type BoxInches } from "@/features/pptx/images/resolve-image-sizing";
import type { ResolvedImage } from "@/features/pptx/types";
import { INSTITUTIONAL_LOGO_URL } from "@/features/quotes/schemas/quote-form.schema";

/**
 * Busca a logo institucional fixa ("Operado por SNOW") via fetch externo.
 * URL fora do ar → placeholder (rodapé segue sem logo, mas com o texto
 * fixo — nunca quebra a geração por isso).
 */
export async function resolveInstitutionalLogo(box: BoxInches): Promise<ResolvedImage> {
  const fetched = await fetchExternalImage(INSTITUTIONAL_LOGO_URL);
  if (!fetched) return { kind: "placeholder" };

  try {
    const sizing = await resolveContainSizing(fetched.buffer, box);
    return { kind: "image", data: fetched.buffer, sizing };
  } catch {
    return { kind: "placeholder" };
  }
}
