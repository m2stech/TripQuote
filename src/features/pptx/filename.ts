function slugify(value: string): string {
  const slug = value
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return slug || "orcamento";
}

/** Nome de download do .pptx, a partir da agência e do destino do orçamento. */
export function buildPptxFileName(agency: string, destination: string): string {
  return `orcamento-${slugify(agency)}-${slugify(destination)}.pptx`;
}
