import { expect, test, type Page } from "@playwright/test";
import { cenarioPadrao, prepararTela, type EstadoFalso } from "./apoio-supabase-falso";

/**
 * Visões das Tarefas (PR 1): seletor de visão, Quadro (Status/Trilha/Prioridade), mover por menu
 * e por arrastar, "+ Nova" na coluna, trilhas com cor e o campo "Começa em".
 * "Hoje" é quarta-feira, 7 de outubro de 2026.
 */
async function abrir(page: Page, estado: EstadoFalso = cenarioPadrao()) {
  await prepararTela(page, estado);
  await page.goto("/dev/tarefas");
  await expect(page.getByText(/\d+ abertas? · \d+ atrasadas?/)).toBeVisible();
  return estado;
}

async function irParaQuadro(page: Page) {
  await page.getByRole("tab", { name: "Quadro" }).click();
  await expect(page.getByRole("region", { name: "Colunas do quadro" })).toBeVisible();
}

const coluna = (page: Page, nome: string) => page.getByRole("region", { name: nome, exact: true });
const patchesDeTarefa = (estado: EstadoFalso) =>
  estado.requisicoes.filter((r) => r.tabela === "tasks" && r.metodo === "PATCH");

test.describe("seletor de visão", () => {
  test("a Lista é o padrão e o Quadro mostra 3 colunas de status", async ({ page }) => {
    await abrir(page);
    await expect(page.getByRole("tab", { name: "Lista" })).toHaveAttribute("aria-selected", "true");
    await irParaQuadro(page);
    for (const nome of ["A fazer", "Fazendo", "Feito"]) {
      await expect(coluna(page, nome)).toBeVisible();
    }
    // 5 abertas em "A fazer", 1 concluída em "Feito".
    await expect(
      coluna(page, "A fazer").getByRole("listitem").filter({ hasText: "Window" }),
    ).toHaveCount(1);
    await expect(coluna(page, "Feito").getByText("Feita ontem")).toBeVisible();
  });

  test("a visão escolhida fica salva no perfil", async ({ page }) => {
    const estado = await abrir(page);
    await irParaQuadro(page);
    await expect
      .poll(() =>
        estado.requisicoes
          .filter((r) => r.tabela === "profiles" && r.metodo === "PATCH")
          .map((r) => r.corpo),
      )
      .toContainEqual({ appearance: expect.objectContaining({ visao_tarefas: "quadro" }) });
  });

  test("perfil com Quadro salvo já abre no Quadro", async ({ page }) => {
    const estado = cenarioPadrao();
    estado.perfil.appearance = { visao_tarefas: "quadro", quadro_agrupar: "prioridade" };
    await prepararTela(page, estado);
    await page.goto("/dev/tarefas");
    await expect(coluna(page, "Alta")).toBeVisible();
    await expect(page.getByRole("tab", { name: "Quadro" })).toHaveAttribute(
      "aria-selected",
      "true",
    );
  });
});

test.describe("Quadro: agrupar por", () => {
  test("Trilha: uma coluna por trilha + Sem trilha, só tarefas abertas", async ({ page }) => {
    await abrir(page);
    await irParaQuadro(page);
    await page.getByRole("radio", { name: "Trilha" }).click();
    for (const nome of ["SQL", "Python", "Power BI", "Sem trilha"]) {
      await expect(coluna(page, nome)).toBeVisible();
    }
    await expect(coluna(page, "SQL").getByText("Window functions")).toBeVisible();
    await expect(coluna(page, "Sem trilha").getByText("Podcast em inglês")).toBeVisible();
    await expect(page.getByText("Feita ontem")).toHaveCount(0);
  });

  test("Prioridade: Alta, Média e Baixa", async ({ page }) => {
    await abrir(page);
    await irParaQuadro(page);
    await page.getByRole("radio", { name: "Prioridade" }).click();
    await expect(coluna(page, "Alta").getByText("Modelagem estrela")).toBeVisible();
    await expect(coluna(page, "Média").getByText("Pandas merge")).toBeVisible();
    await expect(coluna(page, "Baixa").getByText("dbt jaffle shop")).toBeVisible();
  });
});

test.describe("Quadro: mover e criar", () => {
  test("menu 'Mover para…' muda o status (alternativa ao arrastar)", async ({ page }) => {
    const estado = await abrir(page);
    await irParaQuadro(page);
    await page.getByRole("button", { name: "Mover tarefa: Pandas merge" }).click();
    await page.getByRole("menuitem", { name: "Fazendo" }).click();
    await expect(coluna(page, "Fazendo").getByText("Pandas merge")).toBeVisible();
    await expect.poll(() => patchesDeTarefa(estado).at(-1)?.corpo).toEqual({ status: "doing" });
  });

  test("arrastar o cartão pela alça para outra coluna muda o status", async ({ page }) => {
    // Janela larga: as 3 colunas ficam visíveis ao mesmo tempo (no celular a coluna do destino
    // está fora da tela e o arrasto depende da rolagem automática nas bordas).
    await page.setViewportSize({ width: 1100, height: 900 });
    const estado = await abrir(page);
    await irParaQuadro(page);
    const alca = page.getByRole("button", { name: "Arrastar tarefa: dbt jaffle shop" });
    // No centro da tela: a barra de navegação (fixa embaixo) não pode cobrir a alça.
    await alca.evaluate((el) => el.scrollIntoView({ block: "center" }));
    const destino = coluna(page, "Fazendo");
    const a = (await alca.boundingBox())!;
    const d = (await destino.boundingBox())!;
    await page.mouse.move(a.x + a.width / 2, a.y + a.height / 2);
    await page.mouse.down();
    await page.mouse.move(a.x + a.width / 2 + 12, a.y + a.height / 2 + 12, { steps: 4 });
    // Solta perto da borda esquerda da coluna: o centro dela cairia na faixa de rolagem automática
    // (os últimos 20% do quadro) e o quadro rolaria durante o arrasto.
    await page.mouse.move(d.x + 40, d.y + 60, { steps: 12 });
    await page.mouse.up();
    await expect.poll(() => patchesDeTarefa(estado).at(-1)?.corpo).toEqual({ status: "doing" });
    await expect(coluna(page, "Fazendo").getByText("dbt jaffle shop")).toBeVisible();
  });

  test("agrupado por Trilha, mover troca a trilha da tarefa", async ({ page }) => {
    const estado = await abrir(page);
    await irParaQuadro(page);
    await page.getByRole("radio", { name: "Trilha" }).click();
    await page.getByRole("button", { name: "Mover tarefa: Podcast em inglês" }).click();
    await page.getByRole("menuitem", { name: "Python" }).click();
    const corpo = patchesDeTarefa(estado).at(-1)?.corpo as { track_id: string } | undefined;
    expect(corpo?.track_id).toBe(estado.trilhas.find((t) => t.name === "Python")!.id);
    await expect(coluna(page, "Python").getByText("Podcast em inglês")).toBeVisible();
  });

  test("+ Nova dentro de 'Fazendo' cria a tarefa já com esse status", async ({ page }) => {
    const estado = await abrir(page);
    await irParaQuadro(page);
    await coluna(page, "Fazendo")
      .getByRole("button", { name: /Nova tarefa em Fazendo/ })
      .click();
    await page.keyboard.type("Revisar JOINs");
    await page.keyboard.press("Enter");
    await expect(coluna(page, "Fazendo").getByText("Revisar JOINs")).toBeVisible();
    const insercao = estado.requisicoes.find((r) => r.metodo === "POST" && r.tabela === "tasks");
    expect(insercao?.corpo).toMatchObject({ title: "Revisar JOINs", status: "doing" });
  });

  test("a coluna Feito não tem '+ Nova'", async ({ page }) => {
    await abrir(page);
    await irParaQuadro(page);
    await expect(coluna(page, "Feito").getByRole("button", { name: /Nova tarefa/ })).toHaveCount(0);
  });
});

test.describe("trilhas com cor", () => {
  test("folha Trilhas: troca a cor e cria uma trilha nova", async ({ page }) => {
    const estado = await abrir(page);
    await page.getByRole("button", { name: "Trilhas", exact: true }).click();
    const folha = page.getByRole("dialog", { name: "Trilhas" });
    await folha
      .getByRole("radiogroup", { name: "Cor da trilha SQL" })
      .getByRole("radio", { name: "Menta" })
      .click();
    await expect.poll(() => estado.trilhas.find((t) => t.name === "SQL")?.color).toBe("menta");

    await folha.getByLabel("Nome da nova trilha").fill("Estatística");
    await folha.getByRole("button", { name: "Criar trilha" }).click();
    await expect(folha.getByLabel("Nome da trilha Estatística")).toBeVisible();
    expect(estado.trilhas.find((t) => t.name === "Estatística")?.monogram).toBe("ES");
  });
});

test.describe("Começa em", () => {
  async function abrirTarefa(page: Page, titulo: string) {
    await page.getByRole("tab", { name: "Todas" }).click();
    await page.getByRole("button", { name: new RegExp(`^${titulo}`) }).click();
    return page.getByRole("dialog", { name: "Detalhes da tarefa" });
  }

  test("fica desabilitado sem prazo e salva início junto do prazo", async ({ page }) => {
    const estado = await abrir(page);
    const painel = await abrirTarefa(page, "Podcast em inglês");
    await expect(painel.getByLabel("Começa em")).toBeDisabled();
    await painel.getByLabel("Prazo").fill("2026-10-17");
    await expect(painel.getByLabel("Começa em")).toBeEnabled();
    await painel.getByLabel("Começa em").fill("2026-10-13");
    await expect
      .poll(() => patchesDeTarefa(estado).map((r) => r.corpo))
      .toContainEqual({ start_on: "2026-10-13", due_on: "2026-10-17" });
  });

  test("prazo antes do início puxa o início junto", async ({ page }) => {
    const estado = cenarioPadrao();
    const t = estado.tarefas.find((x) => x.title === "dbt jaffle shop")!;
    t.start_on = "2026-10-08";
    t.due_on = "2026-10-12";
    await abrir(page, estado);
    const painel = await abrirTarefa(page, "dbt jaffle shop");
    await painel.getByLabel("Prazo").fill("2026-10-06");
    await expect
      .poll(() => patchesDeTarefa(estado).map((r) => r.corpo))
      .toContainEqual({ start_on: "2026-10-06", due_on: "2026-10-06" });
  });
});
