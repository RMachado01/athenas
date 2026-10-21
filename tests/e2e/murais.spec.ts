import { expect, test, type Page } from "@playwright/test";
import { cenarioPadrao, prepararTela, type EstadoFalso } from "./apoio-supabase-falso";

/** Murais e o quadro (React Flow) no celular, com o Supabase falso em memória. */
const MURAL = "00000000-0000-4000-8000-00000000b001";

function comMural(): EstadoFalso {
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
  estado.murais.itens = [
    {
      id: "00000000-0000-4000-8000-00000000c001",
      board_id: MURAL,
      kind: "nota",
      x: 32,
      y: 32,
      w: 208,
      h: 176,
      z: 1,
      color: "amarelo",
      text: "Revisar JOINs",
      task_id: null,
      parent_id: null,
    },
    {
      id: "00000000-0000-4000-8000-00000000c002",
      board_id: MURAL,
      kind: "nota",
      x: 32,
      y: 320,
      w: 208,
      h: 176,
      z: 2,
      color: "rosa",
      text: "Window functions",
      task_id: null,
      parent_id: null,
    },
    {
      id: "00000000-0000-4000-8000-00000000c003",
      board_id: MURAL,
      kind: "grupo",
      x: 400,
      y: 32,
      w: 480,
      h: 320,
      z: 0,
      color: "azul",
      text: "Semana 1",
      task_id: null,
      parent_id: null,
    },
  ];
  return estado;
}

const requisicoes = (estado: EstadoFalso, tabela: string, metodo: string) =>
  estado.requisicoes.filter((r) => r.tabela === tabela && r.metodo === metodo);

async function abrirQuadro(page: Page, estado: EstadoFalso) {
  await prepararTela(page, estado);
  await page.goto(`/dev/murais/${MURAL}`);
  await expect(page.getByRole("heading", { name: "Plano de SQL", level: 1 })).toBeVisible();
  await expect(page.getByRole("article", { name: "Post-it: Revisar JOINs" })).toBeVisible();
}

const ferramenta = (page: Page, nome: string) =>
  page
    .getByRole("navigation", { name: "Ferramentas do mural" })
    .getByRole("button", { name: nome, exact: true });

test.describe("lista de murais", () => {
  test("sem murais: cria o primeiro e abre o quadro", async ({ page }) => {
    const estado = cenarioPadrao();
    await prepararTela(page, estado);
    await page.goto("/dev/murais");
    await page.getByRole("button", { name: "Criar meu primeiro mural" }).click();
    const folha = page.getByRole("dialog", { name: "Novo mural" });
    await folha.getByLabel("Nome").fill("Ideias do TCC");
    await folha.getByRole("radio", { name: "Roxo" }).click();
    await folha.getByRole("button", { name: "Criar mural" }).click();

    await expect(page).toHaveURL(/\/dev\/murais\/[0-9a-f-]{36}$/);
    await expect(page.getByRole("heading", { name: "Ideias do TCC", level: 1 })).toBeVisible();
    expect(requisicoes(estado, "boards", "POST")[0]!.corpo).toMatchObject({
      title: "Ideias do TCC",
      color: "roxo",
    });
  });

  test("nome vazio mostra erro", async ({ page }) => {
    await prepararTela(page, cenarioPadrao());
    await page.goto("/dev/murais");
    await page.getByRole("button", { name: "Novo mural" }).click();
    const folha = page.getByRole("dialog", { name: "Novo mural" });
    await folha.getByRole("button", { name: "Criar mural" }).click();
    await expect(folha.getByRole("alert")).toHaveText("Dê um nome para o mural.");
  });

  test("lista mostra contagem e arquiva com desfazer", async ({ page }) => {
    const estado = comMural();
    await prepararTela(page, estado);
    await page.goto("/dev/murais");
    await expect(page.getByRole("link", { name: /Plano de SQL.*3 itens/ })).toBeVisible();
    await page.getByRole("button", { name: "Opções do mural Plano de SQL" }).click();
    await page.getByRole("menuitem", { name: "Arquivar" }).click();
    await expect(page.getByRole("link", { name: /Plano de SQL/ })).toHaveCount(0);
    await page.getByRole("button", { name: "Desfazer" }).click();
    await expect(page.getByRole("link", { name: /Plano de SQL/ })).toBeVisible();
  });
});

test.describe("murais arquivados", () => {
  function comArquivado(): EstadoFalso {
    const estado = comMural();
    estado.murais.boards.push({
      id: "00000000-0000-4000-8000-00000000b009",
      title: "Mural antigo",
      color: "rosa",
      icon: "brain",
      track_id: null,
      viewport: { x: 0, y: 0, zoom: 1 },
      archived_at: "2026-10-10T12:00:00Z",
      updated_at: "2026-10-09T12:00:00Z",
    });
    return estado;
  }

  test("sem arquivados, o botão não aparece", async ({ page }) => {
    await prepararTela(page, comMural());
    await page.goto("/dev/murais");
    await expect(page.getByRole("link", { name: /Plano de SQL/ })).toBeVisible();
    await expect(page.getByRole("button", { name: /^Arquivados/ })).toHaveCount(0);
  });

  test("lista os arquivados e restaura um (volta para a lista)", async ({ page }) => {
    const estado = comArquivado();
    await prepararTela(page, estado);
    await page.goto("/dev/murais");
    await expect(page.getByRole("link", { name: /Mural antigo/ })).toHaveCount(0);
    await page.getByRole("button", { name: /^Arquivados · 1/ }).click();
    const folha = page.getByRole("dialog", { name: "Murais arquivados" });
    await expect(folha.getByText("Mural antigo")).toBeVisible();
    await folha.getByRole("button", { name: "Restaurar mural Mural antigo" }).click();
    await page.keyboard.press("Escape");
    await expect(page.getByRole("link", { name: /Mural antigo/ })).toBeVisible();
    expect(estado.murais.boards.find((b) => b.title === "Mural antigo")?.archived_at).toBeNull();
  });

  test("exclui um arquivado de vez, depois de confirmar", async ({ page }) => {
    const estado = comArquivado();
    await prepararTela(page, estado);
    await page.goto("/dev/murais");
    await page.getByRole("button", { name: /^Arquivados · 1/ }).click();
    const folha = page.getByRole("dialog", { name: "Murais arquivados" });
    await folha.getByRole("button", { name: "Excluir mural Mural antigo" }).click();
    const pergunta = page.getByRole("alertdialog", { name: "Excluir mural de vez?" });
    await expect(pergunta).toContainText("Isso não dá para desfazer");
    await pergunta.getByRole("button", { name: "Excluir" }).click();
    await expect
      .poll(() => estado.murais.boards.some((b) => b.title === "Mural antigo"))
      .toBe(false);
    await expect(page.getByRole("button", { name: /^Arquivados/ })).toHaveCount(0);
  });
});

test.describe("excluir mural", () => {
  test("na lista: pergunta antes, cancelar não apaga, confirmar apaga com itens e setas", async ({
    page,
  }) => {
    const estado = comMural();
    await prepararTela(page, estado);
    await page.goto("/dev/murais");
    await page.getByRole("button", { name: "Opções do mural Plano de SQL" }).click();
    await page.getByRole("menuitem", { name: "Excluir…" }).click();

    const pergunta = page.getByRole("alertdialog", { name: "Excluir este mural?" });
    await expect(pergunta).toContainText("Plano de SQL");
    await expect(pergunta).toContainText("os 3 itens e as setas dele");
    await expect(pergunta).toContainText("Isso não dá para desfazer");
    // O foco começa no Cancelar: a ação segura é a padrão.
    await expect(pergunta.getByRole("button", { name: "Cancelar" })).toBeFocused();

    await pergunta.getByRole("button", { name: "Cancelar" }).click();
    expect(requisicoes(estado, "boards", "DELETE")).toHaveLength(0);
    await expect(page.getByRole("link", { name: /Plano de SQL/ })).toBeVisible();

    await page.getByRole("button", { name: "Opções do mural Plano de SQL" }).click();
    await page.getByRole("menuitem", { name: "Excluir…" }).click();
    await page.getByRole("alertdialog").getByRole("button", { name: "Excluir" }).click();
    await expect(page.getByRole("link", { name: /Plano de SQL/ })).toHaveCount(0);
    await expect.poll(() => requisicoes(estado, "boards", "DELETE").length).toBe(1);
    expect(estado.murais.boards).toHaveLength(0);
    expect(estado.murais.itens).toHaveLength(0); // cascata do banco
    expect(estado.murais.ligacoes).toHaveLength(0);
  });

  test("dentro do mural: excluir volta para a lista", async ({ page }) => {
    const estado = comMural();
    await abrirQuadro(page, estado);
    await page.getByRole("button", { name: "Opções do mural" }).click();
    await page.getByRole("menuitem", { name: "Excluir…" }).click();
    await page.getByRole("alertdialog").getByRole("button", { name: "Excluir" }).click();
    await expect(page).toHaveURL(/\/dev\/murais$/);
    await expect(page.getByRole("link", { name: /Plano de SQL/ })).toHaveCount(0);
    expect(estado.murais.boards).toHaveLength(0);
  });

  test("se o banco recusar, o mural volta para a lista e avisa", async ({ page }) => {
    const estado = comMural();
    await prepararTela(page, estado);
    await page.goto("/dev/murais");
    await expect(page.getByRole("link", { name: /Plano de SQL/ })).toBeVisible();
    estado.falharEscritas = true;
    await page.getByRole("button", { name: "Opções do mural Plano de SQL" }).click();
    await page.getByRole("menuitem", { name: "Excluir…" }).click();
    await page.getByRole("alertdialog").getByRole("button", { name: "Excluir" }).click();
    await expect(page.getByText(/Não deu pra excluir o mural/)).toBeVisible();
    await expect(page.getByRole("link", { name: /Plano de SQL/ })).toBeVisible();
  });
});

test.describe("quadro", () => {
  test("adicionar post-it abre a edição e salva o texto", async ({ page }) => {
    const estado = comMural();
    await abrirQuadro(page, estado);
    await ferramenta(page, "Post-it").click();
    const folha = page.getByRole("dialog", { name: "Editar post-it" });
    await expect(folha).toBeVisible();
    await folha.getByLabel("Texto").fill("Praticar CTE");
    await expect.poll(() => requisicoes(estado, "board_items", "PATCH").length).toBeGreaterThan(0);
    await page.keyboard.press("Escape");
    await expect(page.getByRole("article", { name: "Post-it: Praticar CTE" })).toBeVisible();
    expect(requisicoes(estado, "board_items", "POST")[0]!.corpo).toMatchObject({
      board_id: MURAL,
      kind: "nota",
    });
  });

  test("título, grupo e tarefa entram pela barra", async ({ page }) => {
    const estado = comMural();
    await abrirQuadro(page, estado);
    await ferramenta(page, "Título").click();
    await expect(page.getByRole("heading", { name: "Título", level: 3 })).toBeVisible();
    await ferramenta(page, "Grupo").click();
    await expect(page.getByRole("region", { name: "Grupo: Grupo" })).toBeVisible();

    await ferramenta(page, "Tarefa").click();
    const folha = page.getByRole("dialog", { name: "Adicionar tarefa ao mural" });
    await folha.getByRole("button", { name: "Window functions" }).click();
    await expect(page.getByRole("article", { name: "Tarefa: Window functions" })).toBeVisible();
    const post = requisicoes(estado, "board_items", "POST").at(-1)!.corpo as {
      kind: string;
      task_id: string;
    };
    expect(post.kind).toBe("tarefa");
    expect(post.task_id).toBe(estado.tarefas.find((t) => t.title === "Window functions")!.id);
  });

  test("arrastar um post-it salva a nova posição (na grade de 16)", async ({ page }) => {
    const estado = comMural();
    await abrirQuadro(page, estado);
    const nota = page.getByRole("article", { name: "Post-it: Revisar JOINs" });
    const caixa = (await nota.boundingBox())!;
    await page.mouse.move(caixa.x + 40, caixa.y + 40);
    await page.mouse.down();
    await page.mouse.move(caixa.x + 120, caixa.y + 140, { steps: 8 });
    await page.mouse.up();
    await expect.poll(() => requisicoes(estado, "board_items", "PATCH").length).toBeGreaterThan(0);
    const corpo = requisicoes(estado, "board_items", "PATCH").at(-1)!.corpo as {
      x: number;
      y: number;
    };
    expect(corpo.x % 16).toBe(0);
    expect(corpo.y % 16).toBe(0);
    expect(corpo.x).toBeGreaterThan(32);
  });

  test("soltar um post-it dentro do grupo coloca ele no grupo", async ({ page }) => {
    const estado = comMural();
    await abrirQuadro(page, estado);
    await page.getByRole("button", { name: "Enquadrar" }).click();
    await page.waitForTimeout(500); // espera a animação de enquadrar terminar antes de medir
    const nota = page.getByRole("article", { name: "Post-it: Revisar JOINs" });
    const grupo = page.getByRole("region", { name: "Grupo: Semana 1" });
    const a = (await nota.boundingBox())!;
    const g = (await grupo.boundingBox())!;
    await page.mouse.move(a.x + a.width / 2, a.y + a.height / 2);
    await page.mouse.down();
    await page.mouse.move(g.x + g.width / 2, g.y + g.height / 2, { steps: 12 });
    await page.mouse.up();
    await page.waitForTimeout(300);
    await expect
      .poll(() => estado.murais.itens.find((i) => i.text === "Revisar JOINs")!.parent_id)
      .toBe("00000000-0000-4000-8000-00000000c003");
  });

  test("ligar dois itens pelo modo Ligar (toque na origem e no destino)", async ({ page }) => {
    const estado = comMural();
    await abrirQuadro(page, estado);
    await ferramenta(page, "Ligar").click();
    await expect(page.getByText("Toque no item de origem")).toBeVisible();
    await page.getByRole("article", { name: "Post-it: Revisar JOINs" }).click();
    await expect(page.getByText("Agora toque no item de destino")).toBeVisible();
    await page.getByRole("article", { name: "Post-it: Window functions" }).click();
    await expect.poll(() => estado.murais.ligacoes.length).toBe(1);
    expect(estado.murais.ligacoes[0]).toMatchObject({
      from_item: "00000000-0000-4000-8000-00000000c001",
      to_item: "00000000-0000-4000-8000-00000000c002",
    });
    await expect(page.locator(".react-flow__edge")).toHaveCount(1);
  });

  test("apagar pela folha de edição e desfazer", async ({ page }) => {
    const estado = comMural();
    await abrirQuadro(page, estado);
    await page.getByRole("article", { name: "Post-it: Window functions" }).dblclick();
    const folha = page.getByRole("dialog", { name: "Editar post-it" });
    await folha.getByRole("button", { name: "Apagar do mural" }).click();
    await expect(page.getByRole("article", { name: "Post-it: Window functions" })).toHaveCount(0);
    await expect
      .poll(() => estado.murais.itens.some((i) => i.text === "Window functions"))
      .toBe(false);
    await page.getByRole("button", { name: "Desfazer" }).click();
    await expect(page.getByRole("article", { name: "Post-it: Window functions" })).toBeVisible();
  });

  test("trocar a cor salva", async ({ page }) => {
    const estado = comMural();
    await abrirQuadro(page, estado);
    await page.getByRole("article", { name: "Post-it: Revisar JOINs" }).dblclick();
    await page
      .getByRole("dialog", { name: "Editar post-it" })
      .getByRole("radio", { name: "Verde" })
      .click();
    await expect
      .poll(() => estado.murais.itens.find((i) => i.text === "Revisar JOINs")!.color)
      .toBe("verde");
  });
});

test.describe("visão em lista (acessibilidade)", () => {
  test("lista os itens por grupo, com ligações, e edita/apaga pelo teclado", async ({ page }) => {
    const estado = comMural();
    estado.murais.itens[1]!.parent_id = "00000000-0000-4000-8000-00000000c003";
    estado.murais.ligacoes = [
      {
        id: "00000000-0000-4000-8000-00000000d001",
        board_id: MURAL,
        from_item: "00000000-0000-4000-8000-00000000c001",
        to_item: "00000000-0000-4000-8000-00000000c002",
        label: "",
      },
    ];
    await abrirQuadro(page, estado);
    await page.getByRole("button", { name: "Ver como lista" }).click();
    const grupo = page.getByRole("region", { name: "Grupo Semana 1" });
    await expect(grupo.getByText("Window functions")).toBeVisible();
    const soltos = page.getByRole("region", { name: "Itens soltos" });
    await expect(soltos.getByText("Revisar JOINs")).toBeVisible();
    await expect(soltos.getByText("Window functions")).toBeVisible(); // a ligação aparece na linha

    await page.getByRole("button", { name: "Editar Revisar JOINs" }).click();
    await expect(page.getByRole("dialog", { name: "Editar post-it" })).toBeVisible();
    await page.keyboard.press("Escape");
    await page.getByRole("button", { name: "Apagar Revisar JOINs" }).click();
    await expect(soltos).toHaveCount(0);
  });

  test("mural que não existe explica e volta", async ({ page }) => {
    await prepararTela(page, cenarioPadrao());
    await page.goto(`/dev/murais/${MURAL}`);
    await expect(page.getByRole("heading", { name: "Mural não encontrado" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Voltar aos murais" })).toHaveAttribute(
      "href",
      "/dev/murais",
    );
  });
});
