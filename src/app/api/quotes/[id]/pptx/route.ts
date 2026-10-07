import { downloadStorageObject } from "@/features/pptx/storage";
import { buildPptxFileName } from "@/features/pptx/filename";
import { getQuoteRepository } from "@/features/quotes/repository";
import { requireCurrentUserId } from "@/lib/auth/require-current-user-id";
import { createClient } from "@/lib/supabase/server";

/**
 * Download autenticado do .pptx gerado. `repository.getById` usa o client
 * do usuário (cookies de sessão) — a RLS de `quotes` (`quotes_select_own_or_admin`)
 * já nega acesso a orçamento de outro dono, então um `quote` nulo cobre
 * tanto "não existe" quanto "não autorizado", sem diferenciar na resposta
 * (evita enumeração de IDs).
 */
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  try {
    await requireCurrentUserId();
  } catch {
    return new Response("Não autenticado.", { status: 401 });
  }

  const repository = await getQuoteRepository();
  const quote = await repository.getById(id);
  if (!quote || !quote.pptxStoragePath) {
    return new Response("Arquivo não encontrado.", { status: 404 });
  }

  const supabase = await createClient();
  const buffer = await downloadStorageObject(supabase, "generated-pptx", quote.pptxStoragePath);
  const fileName = buildPptxFileName(quote.form.general.agency, quote.form.general.destination);

  return new Response(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.presentationml.presentation",
      "Content-Disposition": `attachment; filename="${fileName}"`,
      "Content-Length": String(buffer.byteLength),
    },
  });
}
