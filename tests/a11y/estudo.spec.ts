import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { cenarioPadrao, prepararTela } from "../e2e/apoio-supabase-falso";
import { definirCookieDeTema } from "../e2e/apoio-tema";

/** Acessibilidade (WCAG 2.2 AA) da aba Estudo e da barra de navegação com rótulos visíveis. */
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

for (const tema of TEMAS) {
  test(`tema ${tema}: aba Estudo e barra`, async ({ page, context }) => {
    await definirCookieDeTema(context, tema);
    await prepararTela(page, cenarioPadrao());
    await page.goto("/dev/estudo");
    await expect(page.getByRole("heading", { name: "Estudo", level: 1 })).toBeVisible();
    await expect(page.getByRole("main").getByRole("link", { name: /^Notas/ })).toBeVisible();
    expect(await auditar(page)).toEqual([]);
  });
}
