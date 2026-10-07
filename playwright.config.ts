import { defineConfig, devices } from "@playwright/test";

/**
 * Testes de navegador real (E2E e acessibilidade).
 * - tests/e2e/*.spec.ts  -> fluxos (tema sem flash, login, offline…)
 * - tests/a11y/*.spec.ts -> acessibilidade com axe em cada tema
 *
 * Roda contra o servidor de DESENVOLVIMENTO (porta 3112) porque a página de laboratório
 * /dev/temas só existe em desenvolvimento. Se você já tem um servidor rodando nessa porta,
 * ele é reaproveitado (fora do CI).
 */
const PORTA = 3112;

export default defineConfig({
  testDir: "./tests",
  testMatch: ["e2e/**/*.spec.ts", "a11y/**/*.spec.ts"],
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [["github"], ["html", { open: "never" }]] : "list",
  use: {
    baseURL: `http://localhost:${PORTA}`,
    locale: "pt-BR",
    trace: "on-first-retry",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command: `pnpm dev -p ${PORTA}`,
    url: `http://localhost:${PORTA}/dev/temas`,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
