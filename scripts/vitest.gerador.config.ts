import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

/**
 * Configuração só para os GERADORES (não são testes): rodam com o mesmo TypeScript e o mesmo
 * alias "@" do app, mas nunca entram na suíte normal. Uso:
 *   ./node_modules/.bin/vitest run --config scripts/vitest.gerador.config.ts
 */
export default defineConfig({
  resolve: {
    alias: { "@": fileURLToPath(new URL("../", import.meta.url)) },
  },
  test: {
    environment: "node",
    include: ["scripts/**/*.gerar.ts"],
  },
});
