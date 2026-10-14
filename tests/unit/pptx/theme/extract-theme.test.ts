import sharp from "sharp";
import { describe, expect, it } from "vitest";

import { DEFAULT_THEME, extractThemeFromLogo } from "@/features/pptx/theme/extract-theme";

function createSolidColorPng(r: number, g: number, b: number, size = 200): Promise<Buffer> {
  return sharp({ create: { width: size, height: size, channels: 3, background: { r, g, b } } })
    .png()
    .toBuffer();
}

describe("extractThemeFromLogo", () => {
  it("logo dourada (caso relatado: GW): primary é o dourado, onPrimary cai para preto (contraste insuficiente com branco)", async () => {
    const goldenLogo = await createSolidColorPng(0xd4, 0xac, 0x34);
    const theme = await extractThemeFromLogo(goldenLogo);

    expect(theme.primary.toUpperCase()).not.toBe(DEFAULT_THEME.primary);
    expect(theme.onPrimary).toBe("000000");
  });

  it("logo azul-escura (contraste bom com branco): onPrimary é branco", async () => {
    const blueLogo = await createSolidColorPng(0x0a, 0x2a, 0x6b);
    const theme = await extractThemeFromLogo(blueLogo);

    expect(theme.onPrimary).toBe("FFFFFF");
  });

  it("logo neutra (cinza/branco, sem cor característica): cai para o tema padrão SNOW", async () => {
    const grayLogo = await createSolidColorPng(0xe0, 0xe0, 0xe0);
    const theme = await extractThemeFromLogo(grayLogo);

    expect(theme).toEqual(DEFAULT_THEME);
  });

  it("buffer inválido: cai para o tema padrão SNOW, sem lançar", async () => {
    const theme = await extractThemeFromLogo(Buffer.from("não é uma imagem"));
    expect(theme).toEqual(DEFAULT_THEME);
  });

  it("onPrimary nunca é uma cor extraída: é sempre branco ou preto puro", async () => {
    const logo = await createSolidColorPng(0xd4, 0xac, 0x34);
    const theme = await extractThemeFromLogo(logo);

    expect(["FFFFFF", "000000"]).toContain(theme.onPrimary);
  });

  it("textOnLight cai para navy quando a cor extraída (dourado) não tem contraste suficiente contra fundo claro", async () => {
    const goldenLogo = await createSolidColorPng(0xd4, 0xac, 0x34);
    const theme = await extractThemeFromLogo(goldenLogo);

    expect(theme.textOnLight).toBe(DEFAULT_THEME.primary);
  });

  it("textOnLight usa a própria cor extraída quando ela já tem contraste suficiente contra fundo claro", async () => {
    const blueLogo = await createSolidColorPng(0x0a, 0x2a, 0x6b);
    const theme = await extractThemeFromLogo(blueLogo);

    expect(theme.textOnLight).toBe(theme.primary);
  });
});
