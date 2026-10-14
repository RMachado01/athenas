import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import {
  baralhoFalso,
  cartaoFalso,
  cenarioPadrao,
  prepararTela,
} from "../e2e/apoio-supabase-falso";
import { definirCookieDeTema } from "../e2e/apoio-tema";

/**
 * Acessibilidade (WCAG 2.2 AA) dos Flashcards: lista de baralhos, um baralho e a revisão com a
 * resposta virada (os 4 botões coloridos precisam de contraste em todos os temas).
 */
const TEMAS = ["ponderosa", "burgundy", "camel", "amethyst", "volt", "mono", "amber", "auto"];
const NOTA = "00000000-0000-4000-8000-00000000f101";

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
  const sql = baralhoFalso("SQL", { color: "roxo" });
  const geral = baralhoFalso("Geral", { is_default: true, color: "cinza" });
  estado.flashcards.baralhos = [sql, geral];
  estado.notas.notas = [
    {
      id: NOTA,
      title: "Chaves",
      icon: null,
      content: { type: "doc", content: [] },
      plain_text: "",
      track_id: null,
      archived_at: null,
      updated_at: "2026-10-07T12:00:00Z",
    },
  ];
  estado.flashcards.cartoes = [
    cartaoFalso(sql.id, "O que é um JOIN?", "Une linhas de duas tabelas"),
    cartaoFalso(sql.id, "O que faz GROUP BY?", "Agrupa linhas", {
      state: 2,
      due: "2026-10-12T12:00:00Z",
      reps: 3,
      stability: 5,
      difficulty: 5,
      last_review: "2026-10-05T12:00:00Z",
    }),
    cartaoFalso(sql.id, "Suspenso?", "Sim", { suspended: true }),
    cartaoFalso(geral.id, "O que é PK?", "Chave primária", { note_id: NOTA }),
  ];
  return { estado, deckId: sql.id };
}

for (const tema of TEMAS) {
  test.describe(`tema ${tema}`, () => {
    test("lista de baralhos e um baralho", async ({ page, context }) => {
      await definirCookieDeTema(context, tema);
      const { estado, deckId } = cenario();
      await prepararTela(page, estado);
      await page.goto("/dev/flashcards");
      await expect(page.getByRole("link", { name: /Revisar tudo/ })).toBeVisible();
      expect(await auditar(page)).toEqual([]);
      await page.goto(`/dev/flashcards/${deckId}`);
      await expect(page.getByRole("button", { name: /O que é um JOIN\?/ })).toBeVisible();
      expect(await auditar(page)).toEqual([]);
    });

    test("revisão com a resposta virada", async ({ page, context }) => {
      await definirCookieDeTema(context, tema);
      await prepararTela(page, cenario().estado);
      await page.goto("/dev/flashcards/revisar");
      await page.getByRole("button", { name: "Mostrar resposta" }).click();
      await expect(page.getByRole("group", { name: "Como foi?" })).toBeVisible();
      expect(await auditar(page)).toEqual([]);
    });
  });
}
