import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { cenarioPadrao, prepararTela } from "../e2e/apoio-supabase-falso";
import { definirCookieDeTema } from "../e2e/apoio-tema";

/** Acessibilidade (WCAG 2.2 AA) dos Murais: lista, quadro e visão em lista, em todos os temas. */
const TEMAS = ["ponderosa", "burgundy", "camel", "amethyst", "volt", "mono", "amber", "auto"];
const MURAL = "00000000-0000-4000-8000-00000000b001";

test.use({ reducedMotion: "reduce" });

async function auditar(page: Page) {
  const resultado = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
    .analyze();
  return resultado.violations.map(
    (v) => `${v.id}: ${v.help} -> ${v.nodes.map((n) => n.target.join(" ")).join(" | ")}`,
  );
}

function cenario() {
  const estado = cenarioPadrao();
  estado.murais.boards = [
    {
      id: MURAL,
      title: "Plano de SQL",
      color: "azul",
      icon: "code",
      track_id: null,
      viewport: { x: 0, y: 0, zoom: 1 },
      archived_at: null,
      updated_at: "2026-10-07T12:00:00Z",
    },
  ];
  const cores = ["amarelo", "rosa", "verde", "azul", "roxo", "laranja", "cinza", "menta"];
  estado.murais.itens = cores.map((cor, i) => ({
    id: `00000000-0000-4000-8000-00000000c00${i}`,
    board_id: MURAL,
    kind: "nota",
    x: 16 + (i % 2) * 176,
    y: 16 + Math.floor(i / 2) * 144,
    w: 160,
    h: 128,
    z: i + 1,
    color: cor,
    text: `Post-it ${cor}`,
    task_id: null,
    parent_id: null,
  }));
  estado.murais.itens.push({
    id: "00000000-0000-4000-8000-00000000c0aa",
    board_id: MURAL,
    kind: "titulo",
    x: 16,
    y: 600,
    w: 320,
    h: 64,
    z: 20,
    color: "amarelo",
    text: "Semana 1",
    task_id: null,
    parent_id: null,
  });
  return estado;
}

for (const tema of TEMAS) {
  test.describe(`tema ${tema}`, () => {
    test("lista de murais", async ({ page, context }) => {
      await definirCookieDeTema(context, tema);
      await prepararTela(page, cenario());
      await page.goto("/dev/murais");
      await expect(page.getByRole("link", { name: /Plano de SQL/ })).toBeVisible();
      expect(await auditar(page)).toEqual([]);
    });

    test("quadro com post-its nas 8 cores e visão em lista", async ({ page, context }) => {
      await definirCookieDeTema(context, tema);
      await prepararTela(page, cenario());
      await page.goto(`/dev/murais/${MURAL}`);
      await expect(page.getByRole("article", { name: "Post-it: Post-it menta" })).toBeVisible();
      expect(await auditar(page)).toEqual([]);
      await page.getByRole("button", { name: "Ver como lista" }).click();
      await expect(page.getByRole("region", { name: "Itens soltos" })).toBeVisible();
      expect(await auditar(page)).toEqual([]);
    });
  });
}
