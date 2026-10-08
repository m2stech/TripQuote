import { expect, test } from "@playwright/test";

import { loginAs } from "./fixtures/auth";
import { ADMIN_USER, CONSULTANT_USER } from "./fixtures/users";

test.describe("Permissões por papel", () => {
  test("consultor é redirecionado ao tentar acessar /admin", async ({ page }) => {
    await loginAs(page, CONSULTANT_USER.email, CONSULTANT_USER.password);
    await page.goto("/admin");
    await expect(page).toHaveURL(/\/orcamentos/);
  });

  test("admin acessa /admin normalmente", async ({ page }) => {
    await loginAs(page, ADMIN_USER.email, ADMIN_USER.password);
    await page.goto("/admin");
    await expect(page).toHaveURL(/\/admin/);
  });
});
