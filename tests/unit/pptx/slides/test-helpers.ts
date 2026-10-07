import type pptxgen from "pptxgenjs";

/**
 * `pres.slides` existe em runtime (getter interno do pptxgenjs) mas não
 * está exposto nos tipos públicos — acesso intencional à estrutura
 * interna, centralizado aqui para não espalhar casts `any` pelos testes.
 */
export function getSlides(pres: pptxgen): Array<ReturnType<pptxgen["addSlide"]>> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- getter interno não tipado publicamente
  return (pres as any).slides;
}

interface RawSlideObject {
  _type: string;
  shape?: string;
  text: Array<{ text: string }> | null;
}

function getRawSlideObjects(slide: ReturnType<pptxgen["addSlide"]>): RawSlideObject[] {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- estrutura interna do pptxgenjs, não exposta nos tipos públicos
  return (slide as any)._slideObjects as RawSlideObject[];
}

/**
 * Extrai todos os textos adicionados a um slide via `addText`, para
 * asserção nos testes. Internamente o PptxGenJS marca tanto texto quanto
 * shape como `_type: "text"` (shapes têm `text: null`), então filtramos por
 * `text` não-nulo para pegar só os textos de fato.
 */
export function getSlideTexts(slide: ReturnType<pptxgen["addSlide"]>): string[] {
  return getRawSlideObjects(slide)
    .filter((object) => object._type === "text" && object.text !== null)
    .flatMap((object) => object.text!.map((t) => t.text));
}

export function getSlideImageCount(slide: ReturnType<pptxgen["addSlide"]>): number {
  return getRawSlideObjects(slide).filter((object) => object._type === "image").length;
}

export function getSlideShapeCount(slide: ReturnType<pptxgen["addSlide"]>): number {
  return getRawSlideObjects(slide).filter((object) => object._type === "text" && object.text === null).length;
}

export function getSlideTableCount(slide: ReturnType<pptxgen["addSlide"]>): number {
  return getRawSlideObjects(slide).filter((object) => object._type === "table").length;
}
