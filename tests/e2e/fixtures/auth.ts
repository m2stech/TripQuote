import type { Page } from "@playwright/test";

/**
 * Preenche e submete o formulário de login (sem data-testid no projeto;
 * seletores por label/role, ver LoginForm.tsx). Aguarda a navegação para
 * fora de `/login` como sinal de sucesso.
 */
export async function loginAs(page: Page, email: string, password: string) {
  await page.goto("/login");
  await page.getByLabel("E-mail").fill(email);
  await page.getByLabel("Senha").fill(password);
  await page.getByRole("button", { name: "Entrar" }).click();
  await page.waitForURL((url) => !url.pathname.startsWith("/login"));
}
