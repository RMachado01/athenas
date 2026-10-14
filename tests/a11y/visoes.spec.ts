import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { cenarioPadrao, prepararTela } from "../e2e/apoio-supabase-falso";
import { definirCookieDeTema } from "../e2e/apoio-tema";

/** Acessibilidade (WCAG 2.2 AA) das visões das Tarefas: Quadro nos 3 agrupamentos e Trilhas. */
const TEMAS = ["ponderosa", "burgundy", "camel", "amethyst", "volt", "mono", "amber", "auto"];

test.use({ reducedMotion: "reduce" });

async function auditar(page: Page) {
  const resultado = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
    .analyze();
  return resultado.violations.map(
    (v) => `${v.id}: ${v.help} -> ${v.nodes.map((n) => n.target.join(" ")).join(" | ")}`,
  );
}

async function abrirQuadro(
  page: Page,
  tema: string,
  context: Parameters<typeof definirCookieDeTema>[0],
) {
  await definirCookieDeTema(context, tema);
  const estado = cenarioPadrao();
  // Cores diferentes nas trilhas: o contraste precisa valer para todas as 8 cores da paleta.
  const cores = ["amarelo", "rosa", "verde"];
  estado.trilhas.forEach((t, i) => (t.color = cores[i % cores.length]!));
  await prepararTela(page, estado);
  await page.goto("/dev/tarefas");
  await expect(page.getByText(/\d+ abertas? · \d+ atrasadas?/)).toBeVisible();
  await page.getByRole("tab", { name: "Quadro" }).click();
  await expect(page.getByRole("region", { name: "Colunas do quadro" })).toBeVisible();
}

for (const tema of TEMAS) {
  test.describe(`tema ${tema}`, () => {
    test("Quadro por status", async ({ page, context }) => {
      await abrirQuadro(page, tema, context);
      expect(await auditar(page)).toEqual([]);
    });

    test("Quadro por trilha e por prioridade", async ({ page, context }) => {
      await abrirQuadro(page, tema, context);
      await page.getByRole("radio", { name: "Trilha" }).click();
      await expect(page.getByRole("region", { name: "SQL", exact: true })).toBeVisible();
      expect(await auditar(page)).toEqual([]);
      await page.getByRole("radio", { name: "Prioridade" }).click();
      await expect(page.getByRole("region", { name: "Alta", exact: true })).toBeVisible();
      expect(await auditar(page)).toEqual([]);
    });

    test("folha de Trilhas e painel com Começa em", async ({ page, context }) => {
      await definirCookieDeTema(context, tema);
      await prepararTela(page, cenarioPadrao());
      await page.goto("/dev/tarefas");
      await expect(page.getByText(/\d+ abertas? · \d+ atrasadas?/)).toBeVisible();
      await page.getByRole("button", { name: "Trilhas", exact: true }).click();
      await expect(page.getByRole("dialog", { name: "Trilhas" })).toBeVisible();
      await page.waitForTimeout(450); // fim da animação da folha
      expect(await auditar(page)).toEqual([]);
      await page.keyboard.press("Escape");
      await page.getByRole("button", { name: /^Window functions/ }).click();
      await expect(page.getByLabel("Começa em")).toBeVisible();
      await page.waitForTimeout(450);
      expect(await auditar(page)).toEqual([]);
    });
  });
}
