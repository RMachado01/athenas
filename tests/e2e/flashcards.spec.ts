import { expect, test, type Page } from "@playwright/test";
import {
  baralhoFalso,
  cartaoFalso,
  cenarioPadrao,
  prepararTela,
  type EstadoFalso,
} from "./apoio-supabase-falso";

/** Flashcards no celular, com Supabase falso (hoje = 2026-10-07 15:00 em São Paulo). */
function comBaralho(): { estado: EstadoFalso; deckId: string } {
  const estado = cenarioPadrao();
  const d = baralhoFalso("SQL");
  estado.flashcards.baralhos = [d];
  estado.flashcards.cartoes = [
    cartaoFalso(d.id, "O que é um JOIN?", "Une linhas de duas tabelas"),
    cartaoFalso(d.id, "O que faz GROUP BY?", "Agrupa linhas"),
  ];
  return { estado, deckId: d.id };
}

const respostas = (e: EstadoFalso) =>
  e.requisicoes.filter((r) => r.tabela === "rpc/responder_cartao");

async function abrirRevisao(page: Page, estado: EstadoFalso) {
  await prepararTela(page, estado);
  await page.goto("/dev/flashcards/revisar");
  await expect(page.getByRole("button", { name: /Pergunta: O que é um JOIN\?/ })).toBeVisible();
}

test.describe("baralhos e cartões", () => {
  test("sem baralhos: cria o primeiro e um cartão", async ({ page }) => {
    const estado = cenarioPadrao();
    await prepararTela(page, estado);
    await page.goto("/dev/flashcards");
    await page.getByRole("button", { name: "Criar meu primeiro baralho" }).click();
    const folha = page.getByRole("dialog", { name: "Novo baralho" });
    await folha.getByLabel("Nome").fill("Anatomia");
    await folha.getByRole("button", { name: "Criar baralho" }).click();
    // Primeira visita à rota dinâmica: o servidor de desenvolvimento compila na hora.
    await expect(page).toHaveURL(/\/dev\/flashcards\/[0-9a-f-]{36}$/, { timeout: 20_000 });
    await page.getByRole("button", { name: "Novo cartão" }).click();
    const novo = page.getByRole("dialog", { name: "Novo cartão" });
    await novo.getByLabel("Frente (pergunta)").fill("Maior osso do corpo?");
    await novo.getByLabel("Verso (resposta)").fill("Fêmur");
    await novo.getByRole("button", { name: "Criar cartão" }).click();
    await expect(page.getByRole("button", { name: /Maior osso do corpo\?/ })).toBeVisible();
    expect(estado.flashcards.cartoes.some((c) => c.back === "Fêmur")).toBe(true);
  });

  test("nome repetido é recusado no campo", async ({ page }) => {
    const { estado } = comBaralho();
    await prepararTela(page, estado);
    await page.goto("/dev/flashcards");
    await page.getByRole("button", { name: "Novo baralho" }).click();
    const folha = page.getByRole("dialog", { name: "Novo baralho" });
    await folha.getByLabel("Nome").fill(" sql ");
    await folha.getByRole("button", { name: "Criar baralho" }).click();
    await expect(folha.getByRole("alert")).toHaveText("Já existe um baralho com esse nome.");
  });

  test("lista mostra contagens", async ({ page }) => {
    const { estado } = comBaralho();
    await prepararTela(page, estado);
    await page.goto("/dev/flashcards");
    await expect(page.getByRole("link", { name: /SQL.*2 novos/ })).toBeVisible();
    await expect(page.getByRole("link", { name: /Revisar tudo \(2\)/ })).toBeVisible();
  });
});

test.describe("revisão", () => {
  test("virar, ver os intervalos, responder e chegar ao resumo", async ({ page }) => {
    const { estado } = comBaralho();
    await abrirRevisao(page, estado);
    await page.getByRole("button", { name: "Mostrar resposta" }).click();
    await expect(page.getByText("Une linhas de duas tabelas")).toBeVisible();
    await expect(
      page.getByRole("button", { name: /^Errei, próxima revisão em .*min/ }),
    ).toBeVisible();
    await page.getByRole("button", { name: /^Fácil/ }).click();
    await expect(
      page.getByRole("button", { name: /Pergunta: O que faz GROUP BY\?/ }),
    ).toBeVisible();
    await page.keyboard.press("Space");
    await page.keyboard.press("4");
    await expect(page.getByText(/2 cartões revisados/)).toBeVisible();
    await expect.poll(() => respostas(estado).length).toBe(2);
  });

  test("Errei faz o cartão voltar na mesma sessão", async ({ page }) => {
    const { estado } = comBaralho();
    estado.flashcards.cartoes = estado.flashcards.cartoes.slice(0, 1);
    await abrirRevisao(page, estado);
    await page.getByRole("button", { name: "Mostrar resposta" }).click();
    await page.getByRole("button", { name: /^Errei/ }).click();
    // Aprendizagem de 1 min: antecipada (até 20 min) — o mesmo cartão aparece de novo.
    await expect(page.getByRole("button", { name: /Pergunta: O que é um JOIN\?/ })).toBeVisible();
  });

  test("duas respostas seguidas do mesmo cartão gravam em ordem (sem conflito)", async ({
    page,
  }) => {
    const { estado } = comBaralho();
    estado.flashcards.cartoes = estado.flashcards.cartoes.slice(0, 1);
    await abrirRevisao(page, estado);
    await page.getByRole("button", { name: "Mostrar resposta" }).click();
    await page.getByRole("button", { name: /^Errei/ }).click();
    await page.getByRole("button", { name: "Mostrar resposta" }).click();
    await page.getByRole("button", { name: /^Bom/ }).click();
    await expect.poll(() => respostas(estado).length).toBe(2);
    expect(estado.flashcards.cartoes[0]!.reps).toBe(2);
    await expect(page.getByText(/foi respondido em outro aparelho/)).toHaveCount(0);
  });

  test("Desfazer volta ao cartão anterior já virado", async ({ page }) => {
    const { estado } = comBaralho();
    await abrirRevisao(page, estado);
    await page.getByRole("button", { name: "Mostrar resposta" }).click();
    await page.getByRole("button", { name: /^Bom/ }).click();
    await page.getByRole("button", { name: "Desfazer última resposta" }).click();
    await expect(page.getByText("Une linhas de duas tabelas")).toBeVisible();
    await expect.poll(() => estado.flashcards.cartoes[0]!.reps).toBe(0);
  });

  test("tempo de revisão vai para o Foco como origem 'revisao'", async ({ page }) => {
    const { estado } = comBaralho();
    await abrirRevisao(page, estado);
    await page.getByRole("button", { name: "Mostrar resposta" }).click();
    // O relógio da tela está fixo: "andamos" 2 minutos fixando uma hora mais tarde.
    await page.clock.setFixedTime(new Date("2026-10-07T18:02:00Z"));
    await page.getByRole("button", { name: /^Fácil/ }).click();
    await page.keyboard.press("Space");
    await page.keyboard.press("4");
    await expect(page.getByText(/2 cartões revisados/)).toBeVisible();
    await expect
      .poll(() =>
        estado.requisicoes
          .filter((r) => r.tabela === "focus_sessions")
          .map((r) => (r.corpo as { origin: string }).origin),
      )
      .toEqual(["revisao"]);
  });
});

test.describe("integração", () => {
  test("linha 'pergunta :: resposta' numa nota vira cartão no baralho Geral", async ({ page }) => {
    const estado = cenarioPadrao();
    const id = "00000000-0000-4000-8000-00000000f001";
    estado.notas.notas = [
      {
        id,
        title: "SQL básico",
        icon: null,
        content: { type: "doc", content: [] },
        plain_text: "",
        track_id: null,
        archived_at: null,
        updated_at: "2026-10-07T12:00:00Z",
        deck_id: null,
      },
    ];
    await prepararTela(page, estado);
    await page.goto(`/dev/notas/${id}`);
    await page.getByRole("textbox", { name: "Conteúdo da nota" }).click();
    await page.keyboard.type("O que é PK? :: Chave primária");
    await expect(page.locator("p.cartao-na-nota")).toBeVisible();
    await expect(page.getByRole("button", { name: /1 cartão · Baralho Geral/ })).toBeVisible();
    await expect.poll(() => estado.flashcards.cartoes.map((c) => c.front)).toEqual(["O que é PK?"]);
    expect(estado.flashcards.baralhos.find((b) => b.is_default)?.name).toBe("Geral");
  });

  test("std::vector em código inline não vira cartão", async ({ page }) => {
    const estado = cenarioPadrao();
    const id = "00000000-0000-4000-8000-00000000f002";
    estado.notas.notas = [
      {
        id,
        title: "C++",
        icon: null,
        content: {
          type: "doc",
          content: [
            {
              type: "paragraph",
              content: [{ type: "text", text: "std::vector", marks: [{ type: "code" }] }],
            },
          ],
        },
        plain_text: "std::vector",
        track_id: null,
        archived_at: null,
        updated_at: "2026-10-07T12:00:00Z",
        deck_id: null,
      },
    ];
    await prepararTela(page, estado);
    await page.goto(`/dev/notas/${id}`);
    await expect(page.locator("p.cartao-na-nota")).toHaveCount(0);
  });

  test("Início mostra Revisar hoje e leva à sessão", async ({ page }) => {
    const { estado } = comBaralho();
    await prepararTela(page, estado);
    await page.goto("/dev/inicio");
    const card = page.getByRole("region", { name: "Revisar hoje" });
    await expect(card).toContainText("2 cartões esperando você");
    await expect(card.getByRole("link", { name: "Começar" })).toHaveAttribute(
      "href",
      "/flashcards/revisar",
    );
  });
});
