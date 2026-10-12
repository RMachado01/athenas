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
  // MOBILE PRIMEIRO: todos os testes rodam num celular (Pixel 7, 412×915, toque). O projeto
  // "desktop" só confere o que não depende do layout (tema sem flash, login, proteção de rotas).
  projects: [
    { name: "mobile", use: { ...devices["Pixel 7"] } },
    {
      name: "desktop",
      use: { ...devices["Desktop Chrome"] },
      testMatch: ["e2e/tema.spec.ts", "e2e/protecao-de-rotas.spec.ts", "a11y/login.spec.ts"],
    },
  ],
  webServer: {
    // Chama o Next direto pelo node (não depende do pnpm estar no PATH nem liberado no sistema).
    command: `node node_modules/next/dist/bin/next dev -p ${PORTA}`,
    url: `http://localhost:${PORTA}/dev/temas`,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    // O proxy valida estas variáveis em toda requisição. Nos testes usamos valores de mentira:
    // sem sessão, o Supabase nem chega a fazer chamada de rede.
    env: {
      NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL ?? "http://localhost:54321",
      NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY:
        process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? "e2e-placeholder",
    },
  },
});
