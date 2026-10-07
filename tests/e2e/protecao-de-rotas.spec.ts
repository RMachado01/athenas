import { expect, test } from "@playwright/test";

/**
 * Sem login, o app inteiro é protegido por padrão (proxy.ts). Estes testes provam isso no
 * navegador real e que a tela de login está de pé.
 */
test.describe("visitante sem login", () => {
  test("a página inicial redireciona para o login", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveURL(/\/login$/);
  });

  test("qualquer rota protegida redireciona e guarda para onde voltar", async ({ page }) => {
    await page.goto("/tarefas");
    await expect(page).toHaveURL(/\/login\?next=%2Ftarefas$/);
  });

  test("a tela de login mostra o botão do Google e a promessa de privacidade", async ({ page }) => {
    await page.goto("/login");
    await expect(page.getByRole("heading", { name: "Athenas" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Entrar com Google" })).toBeEnabled();
    await expect(page.getByText("Nada de agenda sem você pedir.")).toBeVisible();
  });

  test("erro de login vindo do callback aparece com orientação", async ({ page }) => {
    await page.goto("/login?erro=auth");
    // O Next também tem um role="alert" próprio (anunciador de rotas), então filtramos pelo texto.
    await expect(
      page.getByRole("alert").filter({ hasText: "Não deu pra entrar com o Google" }),
    ).toBeVisible();
  });

  test("callback sem código volta para o login com erro (não quebra)", async ({ page }) => {
    await page.goto("/auth/callback");
    await expect(page).toHaveURL(/\/login\?erro=auth$/);
  });

  test("destino malicioso no callback é ignorado", async ({ page }) => {
    await page.goto("/auth/callback?next=https://malicioso.com");
    await expect(page).toHaveURL(/localhost:3112\/login\?erro=auth$/);
  });
});
