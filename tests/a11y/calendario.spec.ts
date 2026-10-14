import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { cenarioPadrao, prepararTela, tarefa, trilha } from "../e2e/apoio-supabase-falso";
import { definirCookieDeTema } from "../e2e/apoio-tema";

/** Acessibilidade (WCAG 2.2 AA) do Calendário do mês e da folha do dia, nos 8 temas. */
const TEMAS = ["ponderosa", "burgundy", "camel", "amethyst", "volt", "mono", "amber", "auto"];
const CORES = ["amarelo", "rosa", "verde", "azul", "roxo", "laranja", "cinza", "menta"];

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
  test.describe(`tema ${tema}`, () => {
    test("calendário com barras nas 8 cores e folha do dia", async ({ page, context }) => {
      await definirCookieDeTema(context, tema);
      const estado = cenarioPadrao();
      // Uma barra de cada cor da paleta: o contraste do texto precisa valer em todas.
      while (estado.trilhas.length < CORES.length) {
        estado.trilhas.push(trilha(`Trilha ${estado.trilhas.length + 1}`));
      }
      estado.trilhas.forEach((t, i) => (t.color = CORES[i]!));
      CORES.forEach((cor, i) => {
        const trilhaId = estado.trilhas[i]!.id;
        estado.tarefas.push(
          tarefa({
            title: `Barra ${cor}`,
            track_id: trilhaId,
            start_on: "2026-10-13",
            due_on: `2026-10-${14 + (i % 4)}`,
          }),
        );
      });
      estado.tarefas.push(
        tarefa({
          title: "Concluída em barra",
          status: "done",
          start_on: "2026-10-20",
          due_on: "2026-10-22",
        }),
      );
      await prepararTela(page, estado);
      await page.goto("/dev/tarefas");
      await expect(page.getByText(/\d+ abertas? · \d+ atrasadas?/)).toBeVisible();
      await page.getByRole("tab", { name: "Calendário" }).click();
      await expect(page.getByRole("heading", { name: "Outubro 2026", level: 2 })).toBeVisible();
      expect(await auditar(page)).toEqual([]);

      await page.locator('[data-dia="2026-10-07"]').click({ position: { x: 12, y: 8 } });
      await expect(page.getByRole("dialog", { name: /7 de outubro/ })).toBeVisible();
      await page.waitForTimeout(450); // fim da animação da folha
      expect(await auditar(page)).toEqual([]);
    });
  });
}
