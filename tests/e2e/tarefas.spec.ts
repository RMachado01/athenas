import { expect, test, type Page } from "@playwright/test";
import {
  cenarioPadrao,
  criarEstado,
  prepararTela,
  trilha,
  type EstadoFalso,
} from "./apoio-supabase-falso";

/**
 * Fluxos reais da tela de Tarefas no navegador, com o Supabase falso em memória.
 * "Hoje" é fixado em quarta-feira, 7 de outubro de 2026 (15:00 em São Paulo).
 */
async function abrir(page: Page, estado: EstadoFalso = cenarioPadrao()) {
  await prepararTela(page, estado);
  await page.goto("/dev/tarefas");
  await expect(page.getByRole("heading", { name: "Tarefas", level: 1 })).toBeVisible();
  // O resumo "N abertas · M atrasadas" só aparece depois que os dados chegam no navegador,
  // ou seja, com a página já interativa (evita digitar antes da hidratação com o servidor frio).
  await expect(page.getByText(/\d+ abertas? · \d+ atrasadas?/)).toBeVisible();
  return estado;
}

const linha = (page: Page, titulo: string) =>
  page.getByRole("button", { name: new RegExp(`^${titulo}`) });

test.describe("lista e grupos", () => {
  test("mostra o resumo e os grupos Atrasadas / Hoje / Esta semana", async ({ page }) => {
    await abrir(page);
    // 5 abertas (a concluída não conta), 1 atrasada.
    await expect(page.getByText("5 abertas · 1 atrasada")).toBeVisible();
    await expect(page.getByRole("heading", { name: "Atrasadas · 1" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Hoje · 2" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Esta semana · 1" })).toBeVisible();
    // Aba padrão (Semana) não mostra "Sem prazo" nem concluídas.
    await expect(page.getByRole("heading", { name: /Sem prazo/ })).toHaveCount(0);
  });

  test("a linha mostra trilha, prazo com hora, estimativa e prioridade", async ({ page }) => {
    await abrir(page);
    const wf = page.getByRole("listitem").filter({ hasText: "Window functions" });
    await expect(wf).toContainText("SQL");
    await expect(wf).toContainText("hoje, 19:00");
    await expect(wf.getByRole("img", { name: "Prioridade alta" })).toBeVisible();
    const estrela = page.getByRole("listitem").filter({ hasText: "Modelagem estrela" });
    await expect(estrela).toContainText("seg, 05/10");
    await expect(estrela).toContainText("1h00");
  });

  test("abas filtram: Hoje, Todas e Concluídas", async ({ page }) => {
    await abrir(page);
    await page.getByRole("tab", { name: "Hoje" }).click();
    await expect(page.getByText("dbt jaffle shop")).toHaveCount(0);
    await expect(page.getByText("Window functions")).toBeVisible();

    await page.getByRole("tab", { name: "Todas" }).click();
    await expect(page.getByRole("heading", { name: "Sem prazo · 1" })).toBeVisible();
    await expect(page.getByText("Podcast em inglês")).toBeVisible();

    await page.getByRole("tab", { name: "Concluídas" }).click();
    await expect(page.getByText("Feita ontem")).toBeVisible();
    await expect(page.getByText("Window functions")).toHaveCount(0);
  });

  test("estado vazio com orientação", async ({ page }) => {
    await abrir(page, criarEstado({ trilhas: [trilha("SQL")] }));
    await expect(
      page.getByText("Nada por aqui. Escreva uma tarefa acima e aperte Enter."),
    ).toBeVisible();
  });
});

test.describe("adicionar rápido", () => {
  test("mostra o que entendeu e cria a tarefa já estruturada", async ({ page }) => {
    const estado = await abrir(page);
    const campo = page.getByLabel("Adicionar rápido");
    await campo.fill("5 exercícios de CTE amanhã 19h #sql !alta ~45min");

    await expect(
      page.getByText("Entendi: amanhã, 19:00 · trilha SQL · prioridade alta · 45 min"),
    ).toBeVisible();

    await campo.press("Enter");

    // Aparece na hora em "Esta semana" (agora com 2) e o campo é limpo e mantém o foco.
    const nova = page.getByRole("listitem").filter({ hasText: "5 exercícios de CTE" });
    await expect(nova).toBeVisible();
    await expect(nova).toContainText("amanhã, 19:00");
    await expect(nova).toContainText("SQL");
    await expect(page.getByRole("heading", { name: "Esta semana · 2" })).toBeVisible();
    await expect(campo).toHaveValue("");
    await expect(campo).toBeFocused();

    // E o que foi enviado ao banco está certo.
    const insercao = estado.requisicoes.find((r) => r.metodo === "POST" && r.tabela === "tasks");
    expect(insercao?.corpo).toMatchObject({
      title: "5 exercícios de CTE",
      due_on: "2026-10-08",
      due_time: "19:00",
      priority: 3,
      estimate_min: 45,
    });
  });

  test("título vazio não envia e avisa", async ({ page }) => {
    const estado = await abrir(page);
    await page.getByLabel("Adicionar rápido").fill("amanhã #sql");
    await page.getByRole("button", { name: "Adicionar", exact: true }).click();
    await expect(
      page.getByRole("alert").filter({ hasText: "Escreva o título da tarefa." }),
    ).toBeVisible();
    expect(estado.requisicoes.some((r) => r.metodo === "POST")).toBe(false);
  });

  test("#trilha que não existe: cria sem trilha e avisa", async ({ page }) => {
    await abrir(page);
    const campo = page.getByLabel("Adicionar rápido");
    await campo.fill("revisar anotações #inexistente");
    await expect(page.getByText("trilha “inexistente” não existe")).toBeVisible();
    await campo.press("Enter");
    await expect(page.getByText("A tarefa foi criada sem trilha.")).toBeVisible();
  });

  test("se o banco recusar, a tarefa some e o aviso diz o que fazer", async ({ page }) => {
    const estado = await abrir(page);
    estado.falharEscritas = true;
    await page.getByLabel("Adicionar rápido").fill("tarefa que vai falhar amanhã");
    await page.getByLabel("Adicionar rápido").press("Enter");
    await expect(page.getByText("Não deu pra salvar a tarefa. Tentar de novo?")).toBeVisible();
    await expect(page.getByText("tarefa que vai falhar")).toHaveCount(0);
  });
});

test.describe("concluir tarefa", () => {
  test("marca, move para Concluídas e o Desfazer devolve", async ({ page }) => {
    const estado = await abrir(page);
    await page.getByRole("button", { name: "Concluir tarefa: Pandas merge" }).click();

    await expect(page.getByText("Tarefa concluída.")).toBeVisible();
    await expect(page.getByRole("heading", { name: "Hoje · 1" })).toBeVisible();
    expect(
      estado.requisicoes.find((r) => r.metodo === "PATCH" && r.tabela === "tasks")?.corpo,
    ).toMatchObject({ status: "done" });

    await page.getByRole("button", { name: "Desfazer" }).click();
    await expect(page.getByRole("heading", { name: "Hoje · 2" })).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Concluir tarefa: Pandas merge" }),
    ).toHaveAttribute("aria-pressed", "false");
  });

  test("reabrir uma concluída a devolve para o grupo certo", async ({ page }) => {
    await abrir(page);
    await page.getByRole("tab", { name: "Concluídas" }).click();
    await page.getByRole("button", { name: "Reabrir tarefa: Feita ontem" }).click();
    await expect(page.getByText("Nenhuma tarefa concluída ainda.")).toBeVisible();
    await page.getByRole("tab", { name: "Todas" }).click();
    // prazo era ontem: volta como atrasada
    await expect(page.getByRole("heading", { name: "Atrasadas · 2" })).toBeVisible();
  });
});

test.describe("painel de detalhes", () => {
  test("selecionar mostra os campos; mudar a prioridade e as notas salva", async ({ page }) => {
    const estado = await abrir(page);
    await linha(page, "Window functions").click();

    const painel = page.getByRole("dialog", { name: "Detalhes da tarefa" });
    await expect(painel.getByLabel("Título da tarefa")).toHaveValue("Window functions");
    // A tarefa já tem trilha: alguma opção (que não "Sem trilha") está marcada.
    await expect(
      painel.getByRole("radiogroup", { name: "Trilha" }).getByRole("radio", { checked: true }),
    ).not.toHaveAccessibleName("Sem trilha");

    await painel.getByRole("radio", { name: "Média" }).click();
    await expect(painel.getByRole("radio", { name: "Média" })).toHaveAttribute(
      "aria-checked",
      "true",
    );

    await painel.getByLabel("Notas").fill("LAG compara com a linha anterior");
    await painel.getByLabel("Notas").blur();

    await expect
      .poll(() => estado.requisicoes.filter((r) => r.metodo === "PATCH").map((r) => r.corpo))
      .toEqual(
        expect.arrayContaining([{ priority: 2 }, { notes: "LAG compara com a linha anterior" }]),
      );
  });

  test("subtarefas: adiciona, conta e conclui", async ({ page }) => {
    await abrir(page);
    await linha(page, "Window functions").click();
    const painel = page.getByRole("dialog", { name: "Detalhes da tarefa" });

    await painel.getByLabel("Nova subtarefa").fill("Ler a documentação de OVER()");
    await painel.getByLabel("Nova subtarefa").press("Enter");
    await expect(painel.getByText("Ler a documentação de OVER()")).toBeVisible();
    await expect(painel.getByRole("heading", { name: "Subtarefas · 0/1" })).toBeVisible();

    await painel.getByRole("button", { name: /Concluir subtarefa/ }).click();
    await expect(painel.getByRole("heading", { name: "Subtarefas · 1/1" })).toBeVisible();
    // A subtarefa NUNCA vira linha solta na lista: o contador aparece na tarefa-mãe.
    await page.keyboard.press("Escape");
    await expect(page.getByRole("listitem").filter({ hasText: "Window functions" })).toContainText(
      "1/1",
    );
  });

  test("título vazio não é aceito: volta ao anterior", async ({ page }) => {
    await abrir(page);
    await linha(page, "Pandas merge").click();
    const titulo = page
      .getByRole("dialog", { name: "Detalhes da tarefa" })
      .getByLabel("Título da tarefa");
    await titulo.fill("   ");
    await titulo.blur();
    await expect(titulo).toHaveValue("Pandas merge");
  });

  test("sem data não há hora; limpar a data limpa a hora", async ({ page }) => {
    await abrir(page);
    await linha(page, "Window functions").click();
    const painel = page.getByRole("dialog", { name: "Detalhes da tarefa" });
    await expect(painel.getByLabel("Hora")).toHaveValue("19:00");
    await painel.getByLabel("Prazo").fill("");
    await expect(painel.getByLabel("Hora")).toBeDisabled();
    await expect(painel.getByLabel("Hora")).toHaveValue("");
  });

  test("excluir pede confirmação; Cancelar mantém, Excluir remove", async ({ page }) => {
    const estado = await abrir(page);
    // "Podcast em inglês" não tem prazo: só aparece na aba "Todas".
    await page.getByRole("tab", { name: "Todas" }).click();
    await linha(page, "Podcast em inglês").click();

    await page.getByRole("button", { name: "Excluir", exact: true }).click();
    const dialogo = page.getByRole("alertdialog", { name: "Excluir esta tarefa?" });
    await expect(dialogo).toBeVisible();
    await dialogo.getByRole("button", { name: "Cancelar" }).click();
    await expect(page.getByText("Podcast em inglês").first()).toBeVisible();

    await page.getByRole("button", { name: "Excluir", exact: true }).click();
    await page.getByRole("alertdialog").getByRole("button", { name: "Excluir" }).click();
    await expect(page.getByRole("listitem").filter({ hasText: "Podcast em inglês" })).toHaveCount(
      0,
    );
    expect(estado.tarefas.some((t) => t.title === "Podcast em inglês")).toBe(false);
  });
});

test.describe("onboarding de trilhas", () => {
  test("sem trilhas: oferece pacotes; escolher cria as trilhas e some", async ({ page }) => {
    const estado = await abrir(
      page,
      criarEstado({
        perfil: { ...criarEstado().perfil, appearance: {} },
      }),
    );
    await expect(page.getByRole("heading", { name: "O que você estuda?" })).toBeVisible();
    await page.getByRole("button", { name: /Dados e BI/ }).click();

    await expect(page.getByRole("heading", { name: "O que você estuda?" })).toHaveCount(0);
    expect(estado.trilhas.map((t) => t.name)).toEqual([
      "SQL",
      "Power BI",
      "Python",
      "Git + dbt",
      "Azure",
      "Inglês",
    ]);
    // A gravação no perfil chega um instante depois da folha sumir: espera ela chegar.
    await expect.poll(() => estado.perfil.appearance).toMatchObject({ trilhas_escolhidas: true });
  });

  test("com trilhas ou já escolhido, não aparece", async ({ page }) => {
    await abrir(page);
    await expect(page.getByRole("heading", { name: "O que você estuda?" })).toHaveCount(0);
  });

  test("'Em branco' não cria trilhas, mas também não pergunta de novo", async ({ page }) => {
    const estado = await abrir(
      page,
      criarEstado({
        perfil: { ...criarEstado().perfil, appearance: {} },
      }),
    );
    await page.getByRole("button", { name: /Em branco/ }).click();
    await expect(page.getByRole("heading", { name: "O que você estuda?" })).toHaveCount(0);
    expect(estado.trilhas).toHaveLength(0);
  });
});

test.describe("barra inferior e nova tarefa pelo botão +", () => {
  test("a barra tem Início, Tarefas e o botão central; todos os itens são links", async ({
    page,
  }) => {
    await abrir(page);
    const barra = page.getByRole("navigation", { name: "Principal" });
    await expect(barra.getByRole("link", { name: "Início" })).toBeVisible();
    await expect(barra.getByRole("link", { name: "Tarefas" })).toBeVisible();
    await expect(barra.getByRole("link", { name: "Foco" })).toBeVisible();
    await expect(barra.getByRole("link", { name: "Agenda" })).toHaveAttribute("href", "/agenda");
    await expect(barra.getByRole("button", { name: "Nova tarefa" })).toBeVisible();
  });

  test("o botão + abre a folha, cria a tarefa e fecha", async ({ page }) => {
    const estado = await abrir(page);
    await page.getByRole("button", { name: "Nova tarefa" }).click();
    const folha = page.getByRole("dialog", { name: "Nova tarefa" });
    await expect(folha).toBeVisible();
    await expect(folha.getByLabel("Adicionar rápido")).toBeFocused();

    await folha.getByLabel("Adicionar rápido").fill("Ler capítulo 3 hoje 20h #python");
    await folha.getByRole("button", { name: "Adicionar", exact: true }).click();

    await expect(folha).toHaveCount(0);
    await expect(page.getByRole("listitem").filter({ hasText: "Ler capítulo 3" })).toBeVisible();
    expect(estado.tarefas.some((t) => t.title === "Ler capítulo 3")).toBe(true);
  });

  test("os atalhos inserem pedaços da frase", async ({ page }) => {
    await abrir(page);
    const campo = page.getByLabel("Adicionar rápido");
    await page.getByRole("button", { name: "amanhã", exact: true }).click();
    await page.getByRole("button", { name: "!alta", exact: true }).click();
    await campo.pressSequentially("estudar SQL");
    await expect(campo).toHaveValue("amanhã !alta estudar SQL");
    await expect(page.getByText("Entendi: amanhã · prioridade alta")).toBeVisible();
  });
});

test.describe("faixa da semana", () => {
  test("mostra os 7 dias com pontinhos e filtra ao tocar num dia", async ({ page }) => {
    await abrir(page);
    const faixa = page.getByRole("group", { name: "Dias da semana" });
    await expect(faixa.getByRole("button")).toHaveCount(7);
    await expect(
      faixa.getByRole("button", { name: /quarta-feira, dia 7: 2 tarefas abertas/ }),
    ).toBeVisible();
    await expect(
      faixa.getByRole("button", { name: /sexta-feira, dia 9: 1 tarefa aberta/ }),
    ).toBeVisible();

    await faixa.getByRole("button", { name: /sexta-feira, dia 9/ }).click();
    await expect(page.getByRole("heading", { name: "Sexta-feira, 9 · 1" })).toBeVisible();
    await expect(page.getByText("dbt jaffle shop")).toBeVisible();
    await expect(page.getByText("Window functions")).toHaveCount(0);

    // tocar de novo desfaz o filtro
    await faixa.getByRole("button", { name: /sexta-feira, dia 9/ }).click();
    await expect(page.getByRole("heading", { name: "Hoje · 2" })).toBeVisible();
  });

  test("dia sem tarefas explica o que fazer", async ({ page }) => {
    await abrir(page);
    await page
      .getByRole("group", { name: "Dias da semana" })
      .getByRole("button", { name: /domingo/ })
      .click();
    await expect(page.getByText("Nenhuma tarefa neste dia.")).toBeVisible();
  });

  test("some nas abas Todas e Concluídas", async ({ page }) => {
    await abrir(page);
    await page.getByRole("tab", { name: "Todas" }).click();
    await expect(page.getByRole("group", { name: "Dias da semana" })).toHaveCount(0);
  });
});
