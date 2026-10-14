import { expect, test, type Page } from "@playwright/test";
import { cenarioPadrao, prepararTela, type EstadoFalso } from "./apoio-supabase-falso";

/** Fluxos da tela de Metas com o Supabase falso em memória. */
async function abrir(page: Page, estado: EstadoFalso = cenarioPadrao()) {
  await prepararTela(page, estado);
  await page.goto("/dev/metas");
  await expect(page.getByRole("heading", { name: "Metas", level: 1 })).toBeVisible();
  return estado;
}

const postsDeMeta = (estado: EstadoFalso) =>
  estado.requisicoes.filter((r) => r.tabela === "goals" && r.metodo === "POST");

function comMetas(): EstadoFalso {
  const estado = cenarioPadrao();
  const sql = estado.trilhas.find((t) => t.name === "SQL")!;
  estado.metas = [
    {
      id: "00000000-0000-4000-8000-0000000000a1",
      title: "5 h de foco por semana",
      kind: "minutos",
      period: "semana",
      target: 300,
      track_id: null,
      atual: 150,
      archived: false,
    },
    {
      id: "00000000-0000-4000-8000-0000000000a2",
      title: "10 tarefas de SQL",
      kind: "tarefas",
      period: "mes",
      target: 10,
      track_id: sql.id,
      atual: 10,
      archived: false,
    },
    {
      id: "00000000-0000-4000-8000-0000000000a3",
      title: "20 h no mês",
      kind: "minutos",
      period: "mes",
      target: 1200,
      track_id: null,
      atual: 960,
      archived: false,
    },
  ];
  return estado;
}

test.describe("lista", () => {
  test("sem metas: explica e oferece sugestões que criam com um toque", async ({ page }) => {
    const estado = await abrir(page);
    await expect(page.getByText("Defina aonde quer chegar")).toBeVisible();
    await page.getByRole("button", { name: "15 tarefas por semana" }).click();
    await expect(page.getByRole("article", { name: /^15 tarefas por semana/ })).toBeVisible();
    await expect.poll(() => postsDeMeta(estado).length).toBe(1);
    expect(postsDeMeta(estado)[0]!.corpo).toMatchObject({
      title: "15 tarefas por semana",
      kind: "tarefas",
      period: "semana",
      target: 15,
      track_id: null,
    });
  });

  test("ordena: mais perto de bater primeiro, batidas por último; mostra progresso e trilha", async ({
    page,
  }) => {
    await abrir(page, comMetas());
    await expect(page.getByRole("article")).toHaveCount(3);
    const titulos = await page
      .getByRole("article")
      .evaluateAll((els) => els.map((e) => e.getAttribute("aria-label")));
    expect(titulos).toEqual([
      "20 h no mês: 16h de 20h neste mês",
      "5 h de foco por semana: 2h30 de 5h nesta semana",
      "10 tarefas de SQL: 10 de 10 tarefas neste mês",
    ]);
    await expect(page.getByText("1 de 3 batidas")).toBeVisible();
    const sql = page.getByRole("article", { name: /^10 tarefas de SQL/ });
    await expect(sql.getByText("Batida!")).toBeVisible();
    await expect(sql.getByText("SQL", { exact: true })).toBeVisible();
    await expect(
      page.getByRole("progressbar", { name: "Progresso da meta 5 h de foco por semana" }),
    ).toHaveAttribute("aria-valuenow", "50");
  });

  test("arquivar some da lista e Desfazer traz de volta", async ({ page }) => {
    const estado = await abrir(page, comMetas());
    await page.getByRole("button", { name: "Arquivar meta 20 h no mês" }).click();
    await expect(page.getByRole("article", { name: /^20 h no mês/ })).toHaveCount(0);
    await expect
      .poll(() => estado.metas.find((m) => m.title === "20 h no mês")!.archived)
      .toBe(true);

    await page.getByRole("button", { name: "Desfazer" }).click();
    await expect(page.getByRole("article", { name: /^20 h no mês/ })).toBeVisible();
    expect(estado.metas.find((m) => m.title === "20 h no mês")!.archived).toBe(false);
  });
});

test.describe("nova meta", () => {
  test("horas viram minutos e o título sugerido é usado", async ({ page }) => {
    const estado = await abrir(page);
    await page.getByRole("button", { name: "Nova meta" }).click();
    const folha = page.getByRole("dialog", { name: "Nova meta" });
    await folha.getByRole("radio", { name: "Por mês" }).click();
    await folha.getByLabel("Horas de foco por mês").fill("2,5");
    await expect(folha.getByLabel("Nome (opcional)")).toHaveAttribute(
      "placeholder",
      "2,5 h de foco por mês",
    );
    await folha
      .getByRole("radiogroup", { name: "Trilha (opcional)" })
      .getByRole("radio", { name: "Python" })
      .click();
    await folha.getByRole("button", { name: "Criar meta" }).click();

    await expect(folha).toHaveCount(0);
    await expect.poll(() => postsDeMeta(estado).length).toBe(1);
    const python = estado.trilhas.find((t) => t.name === "Python")!;
    expect(postsDeMeta(estado)[0]!.corpo).toMatchObject({
      title: "2,5 h de foco por mês",
      kind: "minutos",
      period: "mes",
      target: 150,
      track_id: python.id,
    });
  });

  test("meta de tarefas com nome próprio", async ({ page }) => {
    const estado = await abrir(page);
    await page.getByRole("button", { name: "Nova meta" }).click();
    const folha = page.getByRole("dialog", { name: "Nova meta" });
    await folha.getByRole("radio", { name: "Tarefas" }).click();
    await folha.getByLabel("Tarefas concluídas por semana").fill("12");
    await folha.getByLabel("Nome (opcional)").fill("Ritmo de exercícios");
    await folha.getByRole("button", { name: "Criar meta" }).click();
    await expect(
      page.getByRole("article", { name: /^Ritmo de exercícios: 0 de 12 tarefas/ }),
    ).toBeVisible();
    expect(postsDeMeta(estado)[0]!.corpo).toMatchObject({ kind: "tarefas", target: 12 });
  });

  test("valor inválido mostra erro no campo e não cria", async ({ page }) => {
    const estado = await abrir(page);
    await page.getByRole("button", { name: "Nova meta" }).click();
    const folha = page.getByRole("dialog", { name: "Nova meta" });
    await folha.getByRole("button", { name: "Criar meta" }).click();
    await expect(folha.getByRole("alert")).toHaveText("Digite as horas, por exemplo 5 ou 1,5.");
    await expect(folha.getByLabel("Horas de foco por semana")).toBeFocused();
    expect(postsDeMeta(estado)).toHaveLength(0);
  });

  test("falha ao criar desfaz e avisa", async ({ page }) => {
    const estado = await abrir(page);
    estado.falharEscritas = true;
    await page.getByRole("button", { name: "Nova meta" }).click();
    const folha = page.getByRole("dialog", { name: "Nova meta" });
    await folha.getByLabel("Horas de foco por semana").fill("3");
    await folha.getByRole("button", { name: "Criar meta" }).click();
    await expect(page.getByText("Não deu pra criar a meta")).toBeVisible();
    await expect(page.getByRole("article")).toHaveCount(0);
  });
});

test.describe("Início", () => {
  test("mostra as 3 metas mais perto de bater e leva para /metas", async ({ page }) => {
    await prepararTela(page, comMetas());
    await page.goto("/dev/inicio");
    const secao = page.getByRole("region", { name: "Metas" });
    await expect(secao.getByRole("article")).toHaveCount(3);
    await expect(secao.getByRole("link", { name: "Ver todas" })).toHaveAttribute("href", "/metas");
  });
});
