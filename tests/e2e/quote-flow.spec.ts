import path from "node:path";

import { expect, test } from "@playwright/test";

import { loginAs } from "./fixtures/auth";
import { CONSULTANT_USER } from "./fixtures/users";

const SAMPLE_LOGO_PATH = path.join(__dirname, "fixtures", "sample-logo.png");

/**
 * Fluxo crítico (PRD §7 / CLAUDE.md M10): login → criar orçamento → anexar
 * logo → gerar (IA mockada via mock-ai-server.ts) → baixar o .pptx.
 * Só preenche os dois blocos obrigatórios (01 Dados gerais, 04 Hotéis),
 * confirmando que o restante do formulário é de fato opcional.
 */
test("cria, anexa, gera e baixa um orçamento", async ({ page }) => {
  await loginAs(page, CONSULTANT_USER.email, CONSULTANT_USER.password);

  await page.goto("/orcamentos/novo");

  // 01 — Dados gerais. Preenche só "Agência" primeiro e aguarda o primeiro
  // autosave (sinalizado por `?id=` na URL, ver QuoteForm.tsx:handleDraftPersisted)
  // antes de preencher o resto: assim que esse autosave confirma, a página
  // recebe `initialQuoteId` e o form busca+reseta com `reset(record.form)`
  // (QuoteForm.tsx:147) — preencher tudo de uma vez cria uma corrida em que
  // esse reset sobrescreve campos digitados depois do autosave mas antes dele
  // completar.
  await page.locator("#general\\.agency").fill("Agência Teste E2E");
  await expect(page).toHaveURL(/[?&]id=/, { timeout: 15_000 });

  await page.locator("#general\\.destination").fill("Buenos Aires");
  await page.locator("#general\\.startDate").fill("2026-12-01");
  await page.locator("#general\\.endDate").fill("2026-12-10");
  await page.locator("#general\\.currency").fill("Real brasileiro (R$)");
  await page.locator("#general\\.priceType").click();
  await page.getByRole("option", { name: "Por família" }).click();

  // Upload de logo da agência — exercita o caminho de Storage/Sharp do M5.
  // Único <input type="file"> visível nesta tela por padrão (o de imagem de
  // voo só existe se "Incluir slide de voos" estiver marcado).
  await page.locator('input[type="file"]').setInputFiles(SAMPLE_LOGO_PATH);
  await expect(page.getByRole("button", { name: "Remover" })).toBeVisible();

  // 04 — Hotéis (único bloco de lista obrigatório)
  await expect(page.getByText("0 hotel(éis) adicionado(s)")).toBeVisible();
  await page.getByRole("button", { name: "+ Adicionar hotel" }).click();
  await expect(page.getByText("1 hotel(éis) adicionado(s)")).toBeVisible();
  await page.locator("#hotels\\.0\\.name").fill("Hotel Mock E2E");
  await page.getByLabel("Acomodação 1").fill("Standard | R$ 5.000,00");

  await page.getByRole("button", { name: "Gerar orçamento" }).click();

  await expect(page).toHaveURL(/\/orcamentos\/[^/]+\/gerar/);
  await expect(page.getByText("Orçamento gerado com sucesso!")).toBeVisible({ timeout: 45_000 });

  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("link", { name: "Baixar .pptx" }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toMatch(/\.pptx$/);
});
