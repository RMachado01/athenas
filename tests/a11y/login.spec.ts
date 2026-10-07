import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { definirCookieDeTema } from "../e2e/apoio-tema";

/** A tela de login é a primeira que todo mundo vê: precisa passar no axe em todos os temas. */
for (const tema of ["ponderosa", "burgundy", "camel", "auto"]) {
  test(`/login não tem violações de acessibilidade no tema ${tema}`, async ({ page, context }) => {
    await definirCookieDeTema(context, tema);
    await page.goto("/login");
    await expect(page.getByRole("button", { name: "Entrar com Google" })).toBeVisible();

    const resultado = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
      .analyze();

    const resumo = resultado.violations.map(
      (v) => `${v.id}: ${v.help} -> ${v.nodes.map((n) => n.target.join(" ")).join(" | ")}`,
    );
    expect(resumo).toEqual([]);
  });
}
