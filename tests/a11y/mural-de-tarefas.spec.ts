import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { cenarioPadrao, prepararTela, trilha, USUARIO } from "../e2e/apoio-supabase-falso";
import { definirCookieDeTema } from "../e2e/apoio-tema";

/** Acessibilidade (WCAG 2.2 AA) do Mural das Tarefas: post-its nas 8 cores e a bandeja. */
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
  test(`tema ${tema}: mural com post-its de todas as cores e bandeja`, async ({
    page,
    context,
  }) => {
    await definirCookieDeTema(context, tema);
    const estado = cenarioPadrao();
    while (estado.trilhas.length < CORES.length) {
      estado.trilhas.push(trilha(`Trilha ${estado.trilhas.length + 1}`));
    }
    estado.trilhas.forEach((t, i) => (t.color = CORES[i]!));
    // Um post-it por cor (posicionados em grade) e as 6 tarefas do cenário restantes na bandeja.
    estado.tarefas.length = 0;
    CORES.forEach((cor, i) => {
      const id = `00000000-0000-4000-8000-0000000b${String(i).padStart(4, "0")}`;
      estado.tarefas.push({
        id,
        user_id: USUARIO,
        track_id: estado.trilhas[i]!.id,
        parent_id: null,
        title: `Post-it ${cor}`,
        notes: "",
        priority: 2,
        status: "todo",
        start_on: null,
        due_on: "2026-10-09",
        due_time: null,
        estimate_min: null,
        completed_at: null,
        sort_order: i,
        created_at: "2026-10-01T00:00:00Z",
        updated_at: "2026-10-01T00:00:00Z",
      });
      if (i < 6) {
        estado.posicoes.push({
          user_id: USUARIO,
          task_id: id,
          x: (i % 2) * 224,
          y: Math.floor(i / 2) * 112,
        });
      }
    });
    await prepararTela(page, estado);
    await page.goto("/dev/tarefas");
    await expect(page.getByText(/\d+ abertas? · \d+ atrasadas?/)).toBeVisible();
    await page.getByRole("tab", { name: "Mural" }).click();
    await expect(page.getByRole("article", { name: "Tarefa: Post-it amarelo" })).toBeVisible();
    await expect(page.getByRole("heading", { name: /Chegando/ })).toBeVisible();
    expect(await auditar(page)).toEqual([]);
  });
}
