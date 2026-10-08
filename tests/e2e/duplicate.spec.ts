import { expect, test } from "@playwright/test";

import { loginAs } from "./fixtures/auth";
import { CONSULTANT_USER } from "./fixtures/users";

test("duplicar um orçamento cria uma cópia com um novo id", async ({ page }) => {
  await loginAs(page, CONSULTANT_USER.email, CONSULTANT_USER.password);

  await page.goto("/orcamentos/novo");

  // Preenche "Agência" duas vezes com valores diferentes (a 1ª absorve a
  // notificação inicial do `watch()`, descartada por `useQuoteAutosave`; um
  // `.fill()` repetindo o mesmo valor não dispara `input`/`change`) e aguarda
  // o primeiro autosave (`?id=` na URL) antes do resto — preencher tudo de
  // uma vez cria uma corrida com o `reset(record.form)` que roda assim que a
  // página recebe esse id (ver mesmo comentário em quote-flow.spec.ts).
  const agencyInput = page.locator("#general\\.agency");
  await agencyInput.fill("Agência Duplicar E2E ");
  await agencyInput.fill("Agência Duplicar E2E");
  await expect(page).toHaveURL(/[?&]id=/, { timeout: 15_000 });

  await page.locator("#general\\.destination").fill("Santiago");
  await page.locator("#general\\.startDate").fill("2026-11-01");
  await page.locator("#general\\.endDate").fill("2026-11-05");
  await page.locator("#general\\.currency").fill("Real brasileiro (R$)");
  await page.locator("#general\\.priceType").click();
  await page.getByRole("option", { name: "Por família" }).click();

  await page.getByRole("button", { name: "+ Adicionar hotel" }).click();
  await page.locator("#hotels\\.0\\.name").fill("Hotel Duplicar E2E");
  await page.getByLabel("Acomodação 1").fill("Standard | R$ 3.000,00");

  const url = new URL(page.url());
  const quoteId = url.searchParams.get("id");
  expect(quoteId).toBeTruthy();

  // Aguarda o nome do hotel (preenchido por último) aparecer no resumo da
  // seção 09, sinal de que o autosave (debounce de 800ms) já persistiu os
  // campos restantes antes de navegar para fora do formulário.
  await expect(page.getByText("1 hotel(éis) adicionado(s)")).toBeVisible();
  await page.waitForTimeout(1200);

  await page.goto(`/orcamentos/${quoteId}`);
  await expect(page.getByText("Agência Duplicar E2E", { exact: true }).first()).toBeVisible();

  await page.getByRole("button", { name: "Duplicar" }).click();
  await expect(page).toHaveURL(new RegExp(`/orcamentos/(?!${quoteId}$)[^/]+$`), { timeout: 15_000 });
  await expect(page.getByText("Agência Duplicar E2E", { exact: true }).first()).toBeVisible();
});
