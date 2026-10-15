import { expect, test, type Page } from "@playwright/test";
import { cenarioPadrao, instalarSupabaseFalso, type EstadoFalso } from "./apoio-supabase-falso";

/**
 * Fluxos do cronômetro de Foco no navegador, com relógio FALSO (page.clock): dá para "andar"
 * 25 minutos em milissegundos. O Supabase é o falso em memória.
 * "Agora" = quarta-feira, 7 de outubro de 2026, 15:00 em São Paulo.
 */
async function abrir(page: Page, estado: EstadoFalso = cenarioPadrao()) {
  await page.clock.install({ time: new Date("2026-10-07T18:00:00Z") });
  await instalarSupabaseFalso(page, estado, "2026-10-07");
  await page.goto("/dev/foco");
  await expect(page.getByRole("heading", { name: "Foco", level: 1 })).toBeVisible();
  return estado;
}

const relogio = (page: Page) => page.getByRole("timer");
const sessoes = (estado: EstadoFalso) =>
  estado.requisicoes.filter((r) => r.tabela === "focus_sessions" && r.metodo === "POST");

test.describe("cronômetro", () => {
  test("começa parado em 25:00 e roda ao iniciar; pausar congela", async ({ page }) => {
    await abrir(page);
    await expect(relogio(page)).toHaveText("25:00");
    await expect(page.getByText("Foco · 1 de 4")).toBeVisible();

    await page.getByRole("button", { name: "Iniciar foco" }).click();
    await page.clock.runFor(60_000);
    await expect(relogio(page)).toHaveText("24:00");

    await page.getByRole("button", { name: "Pausar" }).click();
    await page.clock.fastForward(5 * 60_000);
    await expect(relogio(page)).toHaveText("24:00");

    await page.getByRole("button", { name: "Continuar" }).click();
    await page.clock.runFor(60_000);
    await expect(relogio(page)).toHaveText("23:00");
  });

  test("ao chegar a zero grava a sessão e prepara a pausa curta", async ({ page }) => {
    const estado = await abrir(page);
    await page.getByRole("button", { name: "Iniciar foco" }).click();
    await page.clock.fastForward(25 * 60_000 + 1000);

    await expect(page.getByText("Pausa curta · ")).toHaveCount(0); // sem "x de y" na pausa
    await expect(page.getByText("Pausa curta")).toBeVisible();
    await expect(relogio(page)).toHaveText("05:00");
    // A próxima fase fica pausada, esperando a pessoa.
    await expect(page.getByRole("button", { name: "Continuar" })).toBeVisible();

    await expect.poll(() => sessoes(estado).length).toBe(1);
    const corpo = sessoes(estado)[0]!.corpo as {
      kind: string;
      planned_min: number;
      started_at: string;
      ended_at: string;
    };
    expect(corpo.kind).toBe("focus");
    expect(corpo.planned_min).toBe(25);
    expect(Date.parse(corpo.ended_at) - Date.parse(corpo.started_at)).toBe(25 * 60_000);
  });

  test("Concluir agora grava só o que foi focado", async ({ page }) => {
    const estado = await abrir(page);
    await page.getByRole("button", { name: "Iniciar foco" }).click();
    await page.clock.fastForward(10 * 60_000);
    await page.getByRole("button", { name: "Concluir agora" }).click();

    await expect.poll(() => sessoes(estado).length).toBe(1);
    const c = sessoes(estado)[0]!.corpo as { started_at: string; ended_at: string };
    expect(Date.parse(c.ended_at) - Date.parse(c.started_at)).toBeCloseTo(10 * 60_000, -4); // ±5 s (o relógio falso segue andando)
    await expect(page.getByText("Pausa curta")).toBeVisible();
  });

  test("menos de 1 minuto não vira sessão", async ({ page }) => {
    const estado = await abrir(page);
    await page.getByRole("button", { name: "Iniciar foco" }).click();
    await page.clock.runFor(20_000);
    await page.getByRole("button", { name: "Concluir agora" }).click();
    await page.waitForTimeout(300);
    expect(sessoes(estado)).toHaveLength(0);
  });

  test("Descartar volta ao início sem gravar nada", async ({ page }) => {
    const estado = await abrir(page);
    await page.getByRole("button", { name: "Iniciar foco" }).click();
    await page.clock.fastForward(15 * 60_000);
    await page.getByRole("button", { name: "Descartar" }).click();
    await expect(relogio(page)).toHaveText("25:00");
    await expect(page.getByRole("button", { name: "Iniciar foco" })).toBeVisible();
    expect(sessoes(estado)).toHaveLength(0);
  });

  test("sobrevive a recarregar a página (o estado são instantes)", async ({ page }) => {
    await abrir(page);
    await page.getByRole("button", { name: "Iniciar foco" }).click();
    await page.clock.fastForward(5 * 60_000);
    await page.reload();
    await expect(page.getByRole("button", { name: "Pausar" })).toBeVisible();
    // o relógio falso segue andando depois do reload, então aceitamos alguns segundos a menos
    await expect(relogio(page)).toHaveText(/^(20:00|19:[3-5]\d)$/);
  });

  test("estado corrompido no armazenamento é ignorado", async ({ page }) => {
    await page.addInitScript(() => {
      window.localStorage.setItem("athenas-foco", '{"fase":"lixo"}');
    });
    await abrir(page);
    await expect(relogio(page)).toHaveText("25:00");
    await expect(page.getByRole("button", { name: "Iniciar foco" })).toBeVisible();
  });

  test("a tarefa escolhida vai junto na sessão", async ({ page }) => {
    const estado = await abrir(page);
    // Poucas tarefas = pílulas na tela; muitas = botão que abre a lista numa folha.
    const abrirLista = page.getByRole("button", { name: /^Em qual tarefa você vai trabalhar\?:/ });
    if (await abrirLista.count()) await abrirLista.click();
    await page.getByRole("radio", { name: "Pandas merge" }).click();
    await page.getByRole("button", { name: "Iniciar foco" }).click();
    await expect(page.getByText("Pandas merge", { exact: true }).first()).toBeVisible();
    await page.clock.fastForward(2 * 60_000);
    await page.getByRole("button", { name: "Concluir agora" }).click();

    await expect.poll(() => sessoes(estado).length).toBe(1);
    const c = sessoes(estado)[0]!.corpo as { task_id: string | null; track_id: string | null };
    const tarefa = estado.tarefas.find((t) => t.title === "Pandas merge")!;
    expect(c.task_id).toBe(tarefa.id);
    expect(c.track_id).toBe(tarefa.track_id);
  });
});

test.describe("resumos da tela", () => {
  test("mostra meta do dia, sequência e semana a partir dos dados", async ({ page }) => {
    const estado = cenarioPadrao();
    estado.diasDeFoco = [
      { dia: "2026-10-07", minutos: 60, sessoes: 2 },
      { dia: "2026-10-06", minutos: 90, sessoes: 3 },
    ];
    estado.sequencia = { atual: 2, melhor: 4 };
    await abrir(page, estado);

    await expect(page.getByText("1h", { exact: true }).first()).toBeVisible();
    await expect(page.getByText("de 2h")).toBeVisible();
    await expect(page.getByRole("progressbar", { name: "Meta diária de estudo" })).toHaveAttribute(
      "aria-valuenow",
      "50",
    );
    await expect(page.getByRole("progressbar", { name: "Sequência de 2 dias" })).toBeVisible();
    await expect(
      page.getByRole("img", { name: /Minutos de foco por dia: seg 0, ter 90, qua 60/ }),
    ).toBeVisible();
    await expect(
      page.getByRole("img", { name: /2 dias de estudo nas últimas 13 semanas/ }),
    ).toBeVisible();
  });

  test("o cartão de Foco do Início aponta para o cronômetro", async ({ page }) => {
    await page.clock.install({ time: new Date("2026-10-07T18:00:00Z") });
    await instalarSupabaseFalso(page, cenarioPadrao(), "2026-10-07");
    await page.goto("/dev/inicio");
    await expect(page.getByRole("link", { name: /^Foco:/ })).toBeVisible();
    await expect(page.getByRole("link", { name: /^Foco:/ })).toHaveAttribute("href", "/foco");
    await expect(
      page.getByRole("navigation", { name: "Principal" }).getByRole("link", { name: "Foco" }),
    ).toHaveAttribute("href", "/foco");
  });
});

test.describe("vindo das Tarefas", () => {
  test("Começar foco abre o Foco com a tarefa escolhida, sem iniciar o cronômetro", async ({
    page,
  }) => {
    await page.clock.install({ time: new Date("2026-10-07T18:00:00Z") });
    await instalarSupabaseFalso(page, cenarioPadrao(), "2026-10-07");
    await page.goto("/dev/tarefas");
    await page.getByRole("button", { name: /^Window functions/ }).click();
    await page.getByRole("link", { name: "Começar foco" }).click();

    await expect(page).toHaveURL(/\/dev\/foco\?tarefa=/);
    await expect(page.getByRole("heading", { name: "Foco", level: 1 })).toBeVisible();
    await expect(page.getByText("Window functions").first()).toBeVisible();
    await expect(page.getByRole("timer")).toHaveText("25:00");
    await expect(page.getByRole("button", { name: "Iniciar foco" })).toBeVisible();
  });
});
