import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { cenarioPadrao, prepararTela } from "../e2e/apoio-supabase-falso";
import { definirCookieDeTema } from "../e2e/apoio-tema";

/** Acessibilidade (WCAG 2.2 AA) do Início e do Foco em todos os temas. */
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

/** Cenário com histórico de estudo, para o mapa de calor e o gráfico terem o que mostrar. */
function cenarioComFoco() {
  const estado = cenarioPadrao();
  estado.diasDeFoco = [
    { dia: "2026-10-07", minutos: 50, sessoes: 2 },
    { dia: "2026-10-06", minutos: 130, sessoes: 5 },
    { dia: "2026-10-05", minutos: 25, sessoes: 1 },
    { dia: "2026-10-02", minutos: 75, sessoes: 3 },
    { dia: "2026-09-28", minutos: 200, sessoes: 8 },
    { dia: "2026-09-10", minutos: 40, sessoes: 2 },
  ];
  estado.sequencia = { atual: 3, melhor: 5 };
  return estado;
}

for (const tema of TEMAS) {
  test.describe(`tema ${tema}`, () => {
    test("Início", async ({ page, context }) => {
      await definirCookieDeTema(context, tema);
      await prepararTela(page, cenarioComFoco());
      await page.goto("/dev/inicio");
      await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
      await expect(page.getByRole("link", { name: /^Foco:/ })).toBeVisible();
      expect(await auditar(page)).toEqual([]);
    });

    test("Foco", async ({ page, context }) => {
      await definirCookieDeTema(context, tema);
      await prepararTela(page, cenarioComFoco());
      await page.goto("/dev/foco");
      await expect(page.getByRole("heading", { name: "Foco", level: 1 })).toBeVisible();
      await expect(page.getByRole("timer")).toHaveText("25:00");
      expect(await auditar(page)).toEqual([]);
    });
  });
}
