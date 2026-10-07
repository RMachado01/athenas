import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

// Configuração dos testes de unidade (rápidos, sem navegador).
// Testes E2E e de acessibilidade ficam no Playwright (tests/e2e e tests/a11y).
export default defineConfig({
  resolve: {
    // Espelha o alias "@/*" do tsconfig.json para os imports funcionarem nos testes.
    alias: { "@": fileURLToPath(new URL("./", import.meta.url)) },
  },
  test: {
    environment: "node",
    include: ["tests/unit/**/*.test.ts", "tests/db/**/*.test.ts"],
    // PGlite (Postgres em WebAssembly) demora um pouco para iniciar a cada arquivo.
    testTimeout: 30_000,
    hookTimeout: 60_000,
  },
});
