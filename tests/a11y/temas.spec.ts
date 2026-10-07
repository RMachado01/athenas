import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { definirCookieDeTema } from "../e2e/apoio-tema";

/**
 * Acessibilidade (WCAG 2.2 AA) da página de laboratório nos 3 temas e no automático.
 * O axe checa contraste real renderizado, nomes de botões, landmarks, idioma etc.
 * Complementa o teste de unidade de contraste dos tokens.
 */
const TEMAS = ["ponderosa", "burgundy", "camel", "auto"];

for (const tema of TEMAS) {
  test(`/dev/temas não tem violações de acessibilidade no tema ${tema}`, async ({
    page,
    context,
  }) => {
    await definirCookieDeTema(context, tema);
    await page.goto("/dev/temas");
    await expect(page.locator("html")).toHaveAttribute("data-theme", tema);

    const resultado = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
      .analyze();

    // Mensagem útil: lista cada violação com as regras e os elementos afetados.
    const resumo = resultado.violations.map(
      (v) => `${v.id}: ${v.help} -> ${v.nodes.map((n) => n.target.join(" ")).join(" | ")}`,
    );
    expect(resumo).toEqual([]);
  });
}
