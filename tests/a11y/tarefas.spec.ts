import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { cenarioPadrao, criarEstado, prepararTela } from "../e2e/apoio-supabase-falso";
import { definirCookieDeTema } from "../e2e/apoio-tema";

/**
 * Acessibilidade (WCAG 2.2 AA) da tela de Tarefas: contraste real renderizado, nomes de botões,
 * rótulos de campos, landmarks, diálogos. Roda nos 3 temas + automático e em estados diferentes.
 */
const TEMAS = ["ponderosa", "burgundy", "camel", "auto"];

async function auditar(page: Page) {
  const resultado = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
    .analyze();
  return resultado.violations.map(
    (v) => `${v.id}: ${v.help} -> ${v.nodes.map((n) => n.target.join(" ")).join(" | ")}`,
  );
}

for (const tema of TEMAS) {
  test.describe(`tema ${tema}`, () => {
    test("lista de tarefas com painel de detalhes aberto", async ({ page, context }) => {
      await definirCookieDeTema(context, tema);
      await prepararTela(page, cenarioPadrao());
      await page.goto("/dev/tarefas");
      await page.getByRole("button", { name: /^Window functions/ }).click();
      await expect(page.getByRole("complementary", { name: "Detalhes da tarefa" })).toBeVisible();
      await expect(page.getByLabel("Título da tarefa")).toHaveValue("Window functions");
      expect(await auditar(page)).toEqual([]);
    });

    test("escolha de trilhas (onboarding)", async ({ page, context }) => {
      await definirCookieDeTema(context, tema);
      const estado = criarEstado();
      estado.perfil.appearance = {};
      await prepararTela(page, estado);
      await page.goto("/dev/tarefas");
      await expect(page.getByRole("heading", { name: "O que você estuda?" })).toBeVisible();
      expect(await auditar(page)).toEqual([]);
    });
  });
}

test("celular: barra inferior e folha de detalhes", async ({ page, context }) => {
  await definirCookieDeTema(context, "ponderosa");
  await page.setViewportSize({ width: 390, height: 844 });
  await prepararTela(page, cenarioPadrao());
  await page.goto("/dev/tarefas");
  expect(await auditar(page)).toEqual([]);

  await page.getByRole("button", { name: /^Window functions/ }).click();
  await expect(page.getByRole("dialog", { name: "Detalhes da tarefa" })).toBeVisible();
  expect(await auditar(page)).toEqual([]);
});

test("diálogo de confirmação de exclusão", async ({ page, context }) => {
  await definirCookieDeTema(context, "camel");
  await prepararTela(page, cenarioPadrao());
  await page.goto("/dev/tarefas");
  await page.getByRole("button", { name: /^Window functions/ }).click();
  await page.getByRole("button", { name: "Excluir", exact: true }).click();
  await expect(page.getByRole("alertdialog")).toBeVisible();
  expect(await auditar(page)).toEqual([]);
});
