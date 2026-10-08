import { defineConfig, devices } from "@playwright/test";

const PORT = process.env.PORT ?? "3100";
const MOCK_AI_PORT = process.env.MOCK_AI_PORT ?? "4010";
const baseURL = `http://localhost:${PORT}`;

/**
 * Suíte E2E do fluxo crítico (PRD §7 / CLAUDE.md M10). Sobe o app Next.js e
 * um servidor mock da Responses API da OpenAI (ver tests/e2e/mock-ai-server)
 * como `webServer`s do Playwright, contra o Supabase já linkado em `.env` —
 * os testes usam os usuários seed (`npm run db:seed`), nunca dados reais de
 * produção além desses dois usuários de teste.
 */
export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: process.env.CI ? "github" : "html",
  timeout: 60_000,
  use: {
    baseURL,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: [
    {
      command: "npx tsx tests/e2e/mock-ai-server.ts",
      port: Number(MOCK_AI_PORT),
      reuseExistingServer: !process.env.CI,
      timeout: 30_000,
    },
    {
      command: "npm run build && npm run start",
      url: baseURL,
      reuseExistingServer: !process.env.CI,
      timeout: 180_000,
      env: {
        PORT,
        OPENAI_BASE_URL: `http://localhost:${MOCK_AI_PORT}/v1`,
      },
    },
  ],
});
