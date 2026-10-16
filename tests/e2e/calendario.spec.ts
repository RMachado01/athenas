import { expect, test, type Page } from "@playwright/test";
import { cenarioPadrao, prepararTela, tarefa, type EstadoFalso } from "./apoio-supabase-falso";

/**
 * Visões das Tarefas (PR 2): Calendário do mês. "Hoje" é quarta-feira, 7 de outubro de 2026.
 * A tarefa "Python para Dados" é uma barra de 13 a 17 de outubro (segunda a sexta).
 */
function cenario(): EstadoFalso {
  const estado = cenarioPadrao();
  const python = estado.trilhas.find((t) => t.name === "Python")!;
  python.color = "verde";
  estado.tarefas.push(
    tarefa({
      title: "Python para Dados",
      track_id: python.id,
      start_on: "2026-10-13",
      due_on: "2026-10-17",
    }),
  );
  return estado;
}

async function abrir(page: Page, estado: EstadoFalso = cenario()) {
  await prepararTela(page, estado);
  await page.goto("/dev/tarefas");
  await expect(page.getByText(/\d+ abertas? · \d+ atrasadas?/)).toBeVisible();
  await page.getByRole("tab", { name: "Calendário" }).click();
  await expect(page.getByRole("heading", { name: "Outubro 2026", level: 2 })).toBeVisible();
  return estado;
}

const celula = (page: Page, dia: string) => page.locator(`[data-dia="${dia}"]`);
const barra = (page: Page, titulo: string) =>
  page.getByRole("button", { name: new RegExp(`^${titulo}.*Abrir detalhes`) });
const patches = (estado: EstadoFalso) =>
  estado.requisicoes.filter((r) => r.tabela === "tasks" && r.metodo === "PATCH");

/** Toca no número do dia (topo da célula): mais abaixo ficam as barras das tarefas. */
const tocarNoDia = (page: Page, dia: string) =>
  celula(page, dia).click({ position: { x: 12, y: 8 } });

async function centro(loc: ReturnType<typeof celula>) {
  const b = (await loc.boundingBox())!;
  return { x: b.x + b.width / 2, y: b.y + b.height / 2, caixa: b };
}

test.describe("grade do mês", () => {
  test("mostra o mês de hoje, a barra de vários dias e as tarefas de um dia", async ({ page }) => {
    await abrir(page);
    await expect(barra(page, "Python para Dados")).toHaveAttribute(
      "aria-label",
      /de 13\/10 a 17\/10/,
    );
    await expect(barra(page, "Window functions")).toBeVisible();
    // Dia 7 tem 2 tarefas (Window functions e Pandas merge).
    await expect(celula(page, "2026-10-07")).toHaveAttribute(
      "aria-label",
      /7 de outubro, 2 tarefas/,
    );
    await expect(celula(page, "2026-10-08")).toHaveAttribute("aria-label", /sem tarefas/);
  });

  test("setas trocam o mês e 'Hoje' volta ao mês atual", async ({ page }) => {
    await abrir(page);
    const hoje = page.getByRole("button", { name: "Hoje", exact: true });
    await expect(hoje).toBeDisabled();
    await page.getByRole("button", { name: "Próximo mês" }).click();
    await expect(page.getByRole("heading", { name: "Novembro 2026", level: 2 })).toBeVisible();
    await expect(hoje).toBeEnabled();
    await hoje.click();
    await expect(page.getByRole("heading", { name: "Outubro 2026", level: 2 })).toBeVisible();
    await page.getByRole("button", { name: "Mês anterior" }).click();
    await expect(page.getByRole("heading", { name: "Setembro 2026", level: 2 })).toBeVisible();
  });

  test("a visão fica salva no perfil", async ({ page }) => {
    const estado = await abrir(page);
    await expect
      .poll(() =>
        estado.requisicoes
          .filter((r) => r.tabela === "profiles" && r.metodo === "PATCH")
          .map((r) => r.corpo),
      )
      .toContainEqual({ appearance: expect.objectContaining({ visao_tarefas: "calendario" }) });
  });
});

test.describe("tocar na barra e na caixinha", () => {
  test("tocar na barra abre os detalhes da tarefa", async ({ page }) => {
    await abrir(page);
    await barra(page, "Python para Dados").click();
    const painel = page.getByRole("dialog", { name: "Detalhes da tarefa" });
    await expect(painel.getByLabel("Começa em")).toHaveValue("2026-10-13");
    await expect(painel.getByLabel("Prazo")).toHaveValue("2026-10-17");
  });

  test("a caixinha da barra conclui a tarefa", async ({ page }) => {
    const estado = await abrir(page);
    await page.getByRole("button", { name: "Concluir tarefa: Python para Dados" }).click();
    await expect.poll(() => patches(estado).at(-1)?.corpo).toEqual({ status: "done" });
    await expect(
      page.getByRole("button", { name: "Reabrir tarefa: Python para Dados" }),
    ).toHaveAttribute("aria-pressed", "true");
  });
});

test.describe("folha do dia", () => {
  test("tocar no dia lista as tarefas dele e permite criar uma nova", async ({ page }) => {
    const estado = await abrir(page);
    await tocarNoDia(page, "2026-10-07");
    const folha = page.getByRole("dialog", { name: /quarta-feira, 7 de outubro/ });
    await expect(folha.getByRole("button", { name: /^Window functions/ })).toBeVisible();
    await expect(folha.getByRole("button", { name: /^Pandas merge/ })).toBeVisible();

    await folha.getByLabel(/Nova tarefa para 07\/10/).fill("Revisar CTEs");
    await folha.getByRole("button", { name: "Adicionar tarefa neste dia" }).click();
    const insercao = estado.requisicoes.find((r) => r.metodo === "POST" && r.tabela === "tasks");
    expect(insercao?.corpo).toMatchObject({ title: "Revisar CTEs", due_on: "2026-10-07" });
  });

  test("dia sem tarefas avisa e abrir uma tarefa fecha a folha do dia", async ({ page }) => {
    await abrir(page);
    await tocarNoDia(page, "2026-10-08");
    await expect(page.getByText("Nenhuma tarefa neste dia.")).toBeVisible();
    await page.keyboard.press("Escape");
    await tocarNoDia(page, "2026-10-14"); // dia dentro da barra de Python para Dados
    const folha = page.getByRole("dialog", { name: /quarta-feira, 14 de outubro/ });
    await folha.getByRole("button", { name: /^Python para Dados/ }).click();
    await expect(page.getByRole("dialog", { name: "Detalhes da tarefa" })).toBeVisible();
  });
});

test.describe("arrastar e esticar (janela larga, sem rolagem automática)", () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 1100, height: 900 });
  });

  test("arrastar a barra 2 dias para a frente move início e prazo juntos", async ({ page }) => {
    const estado = await abrir(page);
    const b = (await barra(page, "Python para Dados").boundingBox())!;
    const y = b.y + b.height / 2;
    const de = await centro(celula(page, "2026-10-15"));
    const para = await centro(celula(page, "2026-10-17"));
    // Pega a barra no meio (dia 15) e solta sobre o dia 17: 2 dias.
    await page.mouse.move(de.x, y);
    await page.mouse.down();
    await page.mouse.move(de.x + 12, y, { steps: 3 });
    await page.mouse.move(para.x, y, { steps: 10 });
    await page.mouse.up();
    await expect
      .poll(() => patches(estado).at(-1)?.corpo)
      .toEqual({ start_on: "2026-10-15", due_on: "2026-10-19" });
  });

  test("puxar a ponta direita estica o prazo", async ({ page }) => {
    const estado = await abrir(page);
    const b = (await barra(page, "Python para Dados").boundingBox())!;
    const y = b.y + b.height / 2;
    const alvo = await centro(celula(page, "2026-10-18"));
    const cel17 = (await celula(page, "2026-10-17").boundingBox())!;
    const xPonta = cel17.x + cel17.width - 3; // a ponta fica na borda direita do último dia
    await page.mouse.move(xPonta, y);
    await page.mouse.down();
    await page.mouse.move(xPonta + 10, y, { steps: 3 });
    await page.mouse.move(alvo.x, y, { steps: 8 });
    await page.mouse.up();
    await expect
      .poll(() => patches(estado).at(-1)?.corpo)
      .toEqual({ start_on: "2026-10-13", due_on: "2026-10-18" });
  });

  test("puxar a ponta esquerda estica o início", async ({ page }) => {
    const estado = await abrir(page);
    const b = (await barra(page, "Python para Dados").boundingBox())!;
    const y = b.y + b.height / 2;
    const cel13 = (await celula(page, "2026-10-13").boundingBox())!;
    const xPonta = cel13.x + 3;
    const alvo = await centro(celula(page, "2026-10-12"));
    await page.mouse.move(xPonta, y);
    await page.mouse.down();
    await page.mouse.move(xPonta - 10, y, { steps: 3 });
    await page.mouse.move(alvo.x, y, { steps: 8 });
    await page.mouse.up();
    await expect
      .poll(() => patches(estado).at(-1)?.corpo)
      .toEqual({ start_on: "2026-10-12", due_on: "2026-10-17" });
  });
});
