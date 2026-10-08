import { expect, test } from "@playwright/test";

import { loginAs } from "./fixtures/auth";
import { CONSULTANT_USER } from "./fixtures/users";

test.describe("Login", () => {
  test("credenciais inválidas mostram erro e mantêm o usuário em /login", async ({ page }) => {
    await page.goto("/login");
    await page.getByLabel("E-mail").fill(CONSULTANT_USER.email);
    await page.getByLabel("Senha").fill("senha-errada");
    await page.getByRole("button", { name: "Entrar" }).click();

    await expect(page.locator("#login-error")).toContainText("inválidos");
    await expect(page).toHaveURL(/\/login/);
  });

  test("credenciais válidas navegam para a área autenticada", async ({ page }) => {
    await loginAs(page, CONSULTANT_USER.email, CONSULTANT_USER.password);
    await expect(page).toHaveURL(/\/orcamentos/);
  });

  test("rota protegida sem sessão redireciona para /login com ?next", async ({ page }) => {
    await page.goto("/orcamentos");
    await expect(page).toHaveURL(/\/login\?next=%2Forcamentos/);
  });
});
