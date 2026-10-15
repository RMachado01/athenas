import { expect, test, type Page } from "@playwright/test";
import { cenarioPadrao, prepararTela, type EstadoFalso } from "./apoio-supabase-falso";

/** Notas ligadas (editor em blocos, [[links]], backlinks) no celular, com Supabase falso. */
const SQL = "00000000-0000-4000-8000-00000000e001";
const JOINS = "00000000-0000-4000-8000-00000000e002";
const CTES = "00000000-0000-4000-8000-00000000e003";

const nota = (
  id: string,
  title: string,
  extra: Partial<EstadoFalso["notas"]["notas"][number]> = {},
) => ({
  id,
  title,
  icon: null,
  content: { type: "doc", content: [] },
  plain_text: "",
  track_id: null,
  archived_at: null,
  updated_at: "2026-10-07T12:00:00Z",
  ...extra,
});

function comNotas(): EstadoFalso {
  const estado = cenarioPadrao();
  estado.notas.notas = [
    nota(SQL, "SQL básico", {
      plain_text: "Comandos essenciais",
      updated_at: "2026-10-07T14:00:00Z",
    }),
    nota(JOINS, "JOINs", {
      plain_text: "INNER, LEFT, RIGHT e FULL",
      updated_at: "2026-10-07T13:00:00Z",
    }),
    nota(CTES, "CTEs recursivas", { plain_text: "WITH RECURSIVE para hierarquias" }),
  ];
  return estado;
}

const salvamentos = (estado: EstadoFalso) =>
  estado.requisicoes.filter((r) => r.tabela === "rpc/salvar_nota");

async function abrirNota(page: Page, estado: EstadoFalso, id: string) {
  await prepararTela(page, estado);
  await page.goto(`/dev/notas/${id}`);
  await expect(page.getByRole("textbox", { name: "Conteúdo da nota" })).toBeVisible();
}

test.describe("lista de notas", () => {
  test("sem notas: cria a primeira e abre o editor", async ({ page }) => {
    const estado = cenarioPadrao();
    await prepararTela(page, estado);
    await page.goto("/dev/notas");
    await page.getByRole("button", { name: "Criar minha primeira nota" }).click();
    const folha = page.getByRole("dialog", { name: "Nova nota" });
    await folha.getByLabel("Título").fill("Window functions");
    await folha.getByRole("button", { name: "Criar nota" }).click();
    await expect(page).toHaveURL(/\/dev\/notas\/[0-9a-f-]{36}$/);
    await expect(page.getByLabel("Título da nota")).toHaveValue("Window functions");
  });

  test("título repetido é recusado antes de criar", async ({ page }) => {
    await prepararTela(page, comNotas());
    await page.goto("/dev/notas");
    await page.getByRole("button", { name: "Nova nota" }).click();
    const folha = page.getByRole("dialog", { name: "Nova nota" });
    await folha.getByLabel("Título").fill("  joins ");
    await folha.getByRole("button", { name: "Criar nota" }).click();
    await expect(folha.getByRole("alert")).toHaveText("Já existe uma nota com esse título.");
  });

  test("busca por título e por texto (sem acento também)", async ({ page }) => {
    await prepararTela(page, comNotas());
    await page.goto("/dev/notas");
    await expect(page.getByRole("link", { name: /SQL básico/ })).toBeVisible();
    await page.getByLabel("Buscar notas").fill("hierarquias");
    await expect(page.getByRole("link", { name: /CTEs recursivas/ })).toBeVisible();
    await expect(page.getByRole("link", { name: /JOINs/ })).toHaveCount(0);
    await page.getByLabel("Buscar notas").fill("basico");
    await expect(page.getByRole("link", { name: /SQL básico/ })).toBeVisible();
  });
});

test.describe("editor", () => {
  test("escrever salva sozinho (título e texto)", async ({ page }) => {
    const estado = comNotas();
    await abrirNota(page, estado, SQL);
    await page.getByRole("textbox", { name: "Conteúdo da nota" }).click();
    await page.keyboard.type("SELECT é o comando mais usado.");
    await expect(page.getByText("Salvo")).toBeVisible();
    await expect.poll(() => salvamentos(estado).length).toBeGreaterThan(0);
    const ultimo = salvamentos(estado).at(-1)!.corpo as { p_texto: string; p_titulo: string };
    expect(ultimo.p_texto).toContain("SELECT é o comando mais usado.");
    expect(ultimo.p_titulo).toBe("SQL básico");
  });

  test("[[ sugere notas e liga; o link abre a nota citada, que mostra o backlink", async ({
    page,
  }) => {
    const estado = comNotas();
    await abrirNota(page, estado, SQL);
    await page.getByRole("textbox", { name: "Conteúdo da nota" }).click();
    await page.keyboard.type("Ver também [[joi");
    const menu = page.getByRole("listbox", { name: "Ligar a uma nota" });
    await expect(menu.getByRole("option", { name: "JOINs" })).toBeVisible();
    await page.keyboard.press("Enter");
    await expect(page.locator("a.wikilink", { hasText: "JOINs" })).toBeVisible();

    await expect.poll(() => estado.notas.links).toEqual([{ from_note: SQL, to_note: JOINS }]);

    await page.locator("a.wikilink", { hasText: "JOINs" }).click();
    await expect(page.getByLabel("Título da nota")).toHaveValue("JOINs");
    const backlinks = page.getByRole("region", { name: /Citada em 1 nota/ });
    await expect(backlinks.getByRole("link", { name: /SQL básico/ })).toBeVisible();
  });

  test("[[ com nome novo cria a nota e já liga", async ({ page }) => {
    const estado = comNotas();
    await abrirNota(page, estado, SQL);
    await page.getByRole("textbox", { name: "Conteúdo da nota" }).click();
    await page.keyboard.type("[[Índices B-tree");
    await page.getByRole("option", { name: "Criar “Índices B-tree”" }).click();
    await expect(page.locator("a.wikilink", { hasText: "Índices B-tree" })).toBeVisible();
    const nova = estado.notas.notas.find((n) => n.title === "Índices B-tree");
    expect(nova).toBeTruthy();
    await expect.poll(() => estado.notas.links.some((l) => l.to_note === nova!.id)).toBe(true);
  });

  test("/ abre o menu de blocos e insere um checklist", async ({ page }) => {
    const estado = comNotas();
    await abrirNota(page, estado, SQL);
    await page.getByRole("textbox", { name: "Conteúdo da nota" }).click();
    await page.keyboard.type("/check");
    await page
      .getByRole("listbox", { name: "Inserir bloco" })
      .getByRole("option", { name: /Checklist/ })
      .click();
    await page.keyboard.type("Revisar GROUP BY");
    await expect(
      page.locator('ul[data-type="taskList"] li', { hasText: "Revisar GROUP BY" }),
    ).toBeVisible();
  });

  test("link para nota renomeada mostra o nome atual", async ({ page }) => {
    const estado = comNotas();
    estado.notas.notas[0]!.content = {
      type: "doc",
      content: [
        {
          type: "paragraph",
          content: [{ type: "wikilink", attrs: { id: JOINS, label: "Nome antigo" } }],
        },
      ],
    };
    await abrirNota(page, estado, SQL);
    await expect(page.locator("a.wikilink")).toHaveText("JOINs");
  });

  test("título vazio avisa e não salva", async ({ page }) => {
    const estado = comNotas();
    await abrirNota(page, estado, JOINS);
    await page.getByLabel("Título da nota").fill("");
    await expect(page.locator("p[role=alert]")).toContainText("Dê um título para a nota");
    await page.waitForTimeout(1200);
    expect(salvamentos(estado)).toHaveLength(0);
  });

  test("renomear para um título que já existe avisa", async ({ page }) => {
    const estado = comNotas();
    await abrirNota(page, estado, JOINS);
    await page.getByLabel("Título da nota").fill("CTEs recursivas");
    await expect(
      page.getByText("Já existe uma nota com esse título. Escolha outro."),
    ).toBeVisible();
  });

  test("arquivar volta para a lista e Desfazer restaura", async ({ page }) => {
    const estado = comNotas();
    await abrirNota(page, estado, CTES);
    await page.getByRole("button", { name: "Arquivar nota" }).click();
    await expect(page).toHaveURL(/\/dev\/notas$/);
    await expect(page.getByRole("link", { name: /CTEs recursivas/ })).toHaveCount(0);
    await page.getByRole("button", { name: "Desfazer" }).click();
    await expect(page.getByRole("link", { name: /CTEs recursivas/ })).toBeVisible();
  });
});

test.describe("excluir nota", () => {
  test("na lista: pergunta antes e apaga só a nota escolhida", async ({ page }) => {
    const estado = comNotas();
    await prepararTela(page, estado);
    await page.goto("/dev/notas");
    await page.getByRole("button", { name: "Opções da nota CTEs recursivas" }).click();
    await page.getByRole("menuitem", { name: "Excluir…" }).click();
    const pergunta = page.getByRole("alertdialog", { name: "Excluir esta nota?" });
    await expect(pergunta).toContainText("CTEs recursivas");
    await expect(pergunta).toContainText("cartões de revisão");
    await expect(pergunta.getByRole("button", { name: "Cancelar" })).toBeFocused();
    await pergunta.getByRole("button", { name: "Cancelar" }).click();
    expect(
      estado.requisicoes.filter((r) => r.tabela === "notes" && r.metodo === "DELETE"),
    ).toHaveLength(0);

    await page.getByRole("button", { name: "Opções da nota CTEs recursivas" }).click();
    await page.getByRole("menuitem", { name: "Excluir…" }).click();
    await page.getByRole("alertdialog").getByRole("button", { name: "Excluir" }).click();
    await expect(page.getByRole("link", { name: /CTEs recursivas/ })).toHaveCount(0);
    await expect(page.getByRole("link", { name: /SQL básico/ })).toBeVisible();
    await expect
      .poll(() => estado.notas.notas.map((n) => n.title))
      .toEqual(["SQL básico", "JOINs"]);
  });

  test("dentro da nota: excluir volta à lista e NÃO recria a nota ao salvar o que estava pendente", async ({
    page,
  }) => {
    const estado = comNotas();
    await abrirNota(page, estado, CTES);
    // Digita e exclui logo em seguida: o texto pendente nunca pode "ressuscitar" a nota.
    await page.getByRole("textbox", { name: "Conteúdo da nota" }).click();
    await page.keyboard.type("texto ainda não salvo");
    await page.getByRole("button", { name: "Excluir nota" }).click();
    await page.getByRole("alertdialog").getByRole("button", { name: "Excluir" }).click();
    await expect(page).toHaveURL(/\/dev\/notas$/);
    await expect(page.getByRole("link", { name: /CTEs recursivas/ })).toHaveCount(0);
    await page.waitForTimeout(1500); // passa da espera de salvar (800 ms) e do "salvar ao sair"
    const salvou = estado.requisicoes.filter((r) => r.tabela === "rpc/salvar_nota");
    expect(salvou).toHaveLength(0);
    expect(estado.notas.notas.some((n) => n.id === CTES)).toBe(false);
  });
});
