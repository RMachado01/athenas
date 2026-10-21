import { expect, test, type Page } from "@playwright/test";
import {
  cenarioPadrao,
  criarEstado,
  prepararTela,
  USUARIO,
  type EstadoFalso,
} from "./apoio-supabase-falso";

/**
 * Visões das Tarefas (PR 3): Mural das Tarefas. "Hoje" é quarta-feira, 7 de outubro de 2026.
 * O cenário padrão tem 5 tarefas abertas e 1 concluída.
 */
async function abrir(page: Page, estado: EstadoFalso = cenarioPadrao()) {
  await prepararTela(page, estado);
  await page.goto("/dev/tarefas");
  await expect(page.getByText(/\d+ abertas? · \d+ atrasadas?/)).toBeVisible();
  await page.getByRole("tab", { name: "Mural" }).click();
  await expect(page.getByRole("tab", { name: "Mural" })).toHaveAttribute("aria-selected", "true");
  return estado;
}

const postit = (page: Page, titulo: string) =>
  page.getByRole("article", { name: `Tarefa: ${titulo}` });
const gravacoes = (estado: EstadoFalso) =>
  estado.requisicoes.filter((r) => r.tabela === "task_positions" && r.metodo === "POST");

test.describe("bandeja Chegando", () => {
  test("sem posições salvas, todas as abertas esperam na bandeja", async ({ page }) => {
    await abrir(page);
    await expect(page.getByRole("heading", { name: /Chegando/ })).toContainText("5");
    await expect(
      page.getByRole("button", { name: "Colocar no mural: Window functions" }),
    ).toBeVisible();
    await expect(page.getByRole("button", { name: "Colocar todas" })).toBeVisible();
    await expect(page.getByRole("article")).toHaveCount(0);
    // A concluída ("Feita ontem") nunca aparece no mural.
    await expect(page.getByText("Feita ontem")).toHaveCount(0);
  });

  test("colocar uma tarefa cria o post-it e guarda a posição na grade de 16 px", async ({
    page,
  }) => {
    const estado = await abrir(page);
    await page.getByRole("button", { name: "Colocar no mural: Window functions" }).click();
    await expect(postit(page, "Window functions")).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Colocar no mural: Window functions" }),
    ).toHaveCount(0);
    await expect(page.getByRole("heading", { name: /Chegando/ })).toContainText("4");
    await expect.poll(() => gravacoes(estado).length).toBe(1);
    const p = gravacoes(estado)[0]!.corpo as {
      user_id: string;
      task_id: string;
      x: number;
      y: number;
    };
    expect(p.user_id).toBe(USUARIO);
    expect(p.x % 16).toBe(0);
    expect(p.y % 16).toBe(0);
  });

  test("colocar todas gera posições diferentes (nada empilhado)", async ({ page }) => {
    const estado = await abrir(page);
    await page.getByRole("button", { name: "Colocar todas" }).click();
    await expect(page.getByRole("article")).toHaveCount(5);
    await expect.poll(() => gravacoes(estado).length).toBe(5);
    const posicoes = gravacoes(estado).map((g) => {
      const c = g.corpo as { x: number; y: number };
      return `${c.x},${c.y}`;
    });
    expect(new Set(posicoes).size).toBe(5);
    await expect(page.getByRole("heading", { name: /Chegando/ })).toHaveCount(0);
  });
});

test.describe("post-its no mural", () => {
  function comPosicoes(): EstadoFalso {
    const estado = cenarioPadrao();
    const [modelagem, window] = estado.tarefas;
    estado.posicoes = [
      { user_id: USUARIO, task_id: modelagem!.id, x: 16, y: 16 },
      { user_id: USUARIO, task_id: window!.id, x: 16, y: 160 },
    ];
    return estado;
  }

  test("tarefas com posição já aparecem no mural; as outras ficam na bandeja", async ({ page }) => {
    await abrir(page, comPosicoes());
    await expect(postit(page, "Modelagem estrela")).toBeVisible();
    await expect(postit(page, "Window functions")).toBeVisible();
    await expect(page.getByRole("heading", { name: /Chegando/ })).toContainText("3");
    await expect(
      page.getByRole("button", { name: "Colocar no mural: Pandas merge" }),
    ).toBeVisible();
  });

  test("arrastar o post-it salva a nova posição (encaixada na grade)", async ({ page }) => {
    const estado = await abrir(page, comPosicoes());
    const alvo = postit(page, "Modelagem estrela");
    const antes = (await alvo.boundingBox())!;
    const x = antes.x + antes.width / 2;
    const y = antes.y + antes.height - 10; // pega pela base (longe dos botões do cartão)
    await page.mouse.move(x, y);
    await page.mouse.down();
    await page.mouse.move(x + 20, y + 10, { steps: 4 });
    await page.mouse.move(x + 90, y + 40, { steps: 8 });
    await page.mouse.up();
    await expect.poll(() => gravacoes(estado).length).toBeGreaterThan(0);
    const ultima = gravacoes(estado).at(-1)!.corpo as { task_id: string; x: number; y: number };
    expect(ultima.task_id).toBe(estado.tarefas[0]!.id);
    expect(ultima.x % 16).toBe(0);
    expect(ultima.y % 16).toBe(0);
    expect(ultima.x).toBeGreaterThan(16); // andou para a direita
    expect(ultima.y).toBeGreaterThan(16); // e para baixo
  });

  test("a caixinha conclui a tarefa e o post-it sai do mural", async ({ page }) => {
    const estado = await abrir(page, comPosicoes());
    await page.getByRole("button", { name: "Concluir tarefa: Window functions" }).click();
    await expect(postit(page, "Window functions")).toHaveCount(0);
    const patch = estado.requisicoes.find((r) => r.tabela === "tasks" && r.metodo === "PATCH");
    expect(patch?.corpo).toEqual({ status: "done" });
    // Concluir não pode abrir os detalhes (o clique da caixinha não sobe até o post-it).
    await expect(page.getByRole("dialog", { name: "Detalhes da tarefa" })).toHaveCount(0);
  });

  test("o botão de abrir mostra os detalhes da tarefa", async ({ page }) => {
    await abrir(page, comPosicoes());
    await page.getByRole("button", { name: "Opções da tarefa: Modelagem estrela" }).click();
    await page.getByRole("menuitem", { name: "Abrir detalhes" }).click();
    const painel = page.getByRole("dialog", { name: "Detalhes da tarefa" });
    await expect(painel.getByRole("textbox", { name: "Título da tarefa" })).toHaveValue(
      "Modelagem estrela",
    );
  });

  test("'Voltar para a bandeja' tira o post-it do mural, mantém a tarefa e dá para colocar de novo", async ({
    page,
  }) => {
    const estado = await abrir(page, comPosicoes());
    await expect(page.getByRole("heading", { name: /Chegando/ })).toContainText("3");
    await page.getByRole("button", { name: "Opções da tarefa: Modelagem estrela" }).click();
    await page.getByRole("menuitem", { name: "Voltar para a bandeja" }).click();
    await expect(postit(page, "Modelagem estrela")).toHaveCount(0);
    await expect(page.getByRole("heading", { name: /Chegando/ })).toContainText("4");
    await expect(
      page.getByRole("button", { name: "Colocar no mural: Modelagem estrela" }),
    ).toBeVisible();
    // A tarefa continua existindo (só a posição foi apagada).
    expect(estado.tarefas.some((t) => t.title === "Modelagem estrela")).toBe(true);
    expect(estado.posicoes.some((p) => p.task_id === estado.tarefas[0]!.id)).toBe(false);
    // E dá para colocar de novo.
    await page.getByRole("button", { name: "Colocar no mural: Modelagem estrela" }).click();
    await expect(postit(page, "Modelagem estrela")).toBeVisible();
  });

  test("a visão fica salva no perfil", async ({ page }) => {
    const estado = await abrir(page);
    await expect
      .poll(() =>
        estado.requisicoes
          .filter((r) => r.tabela === "profiles" && r.metodo === "PATCH")
          .map((r) => r.corpo),
      )
      .toContainEqual({ appearance: expect.objectContaining({ visao_tarefas: "mural" }) });
  });
});

test.describe("estados vazios", () => {
  test("sem tarefas abertas, explica o que fazer", async ({ page }) => {
    await abrir(page, criarEstado());
    await expect(page.getByText(/Nenhuma tarefa aberta/)).toBeVisible();
    await expect(page.getByRole("region", { name: "Mural das tarefas" })).toHaveCount(0);
  });
});
