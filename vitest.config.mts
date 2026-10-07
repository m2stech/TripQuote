import { fileURLToPath } from "node:url";

import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    tsconfigPaths: true,
    alias: {
      // `server-only` lança erro fora do bundler do Next.js (ver pacote);
      // nos testes, substituímos por um módulo vazio para permitir importar
      // código server-only (ex.: repositórios Supabase) diretamente.
      "server-only": fileURLToPath(new URL("./tests/unit/mocks/server-only.ts", import.meta.url)),
    },
  },
  test: {
    environment: "node",
    include: ["tests/unit/**/*.test.ts", "src/**/*.test.ts"],
    coverage: { provider: "v8", include: ["src/**"] },
  },
});
