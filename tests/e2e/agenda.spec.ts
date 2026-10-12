import { expect, test, type Page } from "@playwright/test";
import {
  cenarioPadrao,
  instalarApiGoogleFalsa,
  prepararTela,
  type EstadoFalso,
} from "./apoio-supabase-falso";

/**
 * Agenda (estilo Notion Calendar) e conexão com o Google, com Supabase e /api/google falsos.
 * "Hoje" = quarta, 7 de outubro de 2026, 15:00 em São Paulo (UTC-3).
 */
function conectado(ultimaSync: string | null = "2026-10-07T17:00:00Z"): EstadoFalso {
  const estado = cenarioPadrao();
  estado.google = {
    conexao: { status: "active", last_synced_at: ultimaSync, last_error: null },
    agendas: [
      {
        google_calendar_id: "eu@gmail.com",
        summary: "Pessoal",
        color: "#4285f4",
        is_primary: true,
        enabled: true,
      },
      {
        google_calendar_id: "trabalho",
        summary: "Trabalho",
        color: "#0b8043",
        is_primary: false,
        enabled: false,
      },
    ],
    eventos: [
      {
        id: "e1",
        google_calendar_id: "eu@gmail.com",
        title: "Plantão na central",
        all_day: false,
        starts_at: "2026-10-07T12:00:00Z", // 09:00 em SP
        ends_at: "2026-10-07T14:00:00Z", // 11:00
        start_date: null,
        end_date: null,
      },
      {
        id: "e2",
        google_calendar_id: "eu@gmail.com",
        title: "Feriado municipal",
        all_day: true,
        starts_at: null,
        ends_at: null,
        start_date: "2026-10-07",
        end_date: "2026-10-08",
      },
      {
        id: "e3",
        google_calendar_id: "eu@gmail.com",
        title: "Almoço em família",
        all_day: false,
        starts_at: "2026-10-09T15:00:00Z", // sexta 12:00
        ends_at: "2026-10-09T16:30:00Z",
        start_date: null,
        end_date: null,
      },
    ],
  };
  return estado;
}

async function abrir(page: Page, estado: EstadoFalso, respostaDoSync = { status: "ok" }) {
  await prepararTela(page, estado);
  const chamadas = await instalarApiGoogleFalsa(page, estado, respostaDoSync);
  await page.goto("/dev/agenda");
  await expect(page.getByRole("heading", { name: "Agenda", level: 1 })).toBeVisible();
  return chamadas;
}

test.describe("sem Google conectado", () => {
  test("convida a conectar e ainda mostra as tarefas do dia", async ({ page }) => {
    await abrir(page, cenarioPadrao());
    await expect(page.getByText("Traga seus compromissos")).toBeVisible();
    await expect(page.getByRole("link", { name: "Conectar" })).toHaveAttribute(
      "href",
      "/personalizacao#google",
    );
    const dia = page.getByRole("region", { name: /^Agenda de quarta-feira/ });
    // tarefa com hora vai para a grade; sem hora, para "Dia todo"
    await expect(dia.getByText("Window functions")).toBeVisible();
    await expect(dia.getByText("Pandas merge")).toBeVisible();
  });
});

test.describe("com Google conectado", () => {
  test("mostra eventos na grade e no Dia todo, com status da sincronização", async ({ page }) => {
    const chamadas = await abrir(page, conectado());
    await expect(
      page.getByRole("button", { name: "Plantão na central, 09:00–11:00" }),
    ).toBeVisible();
    await expect(page.getByRole("button", { name: "Feriado municipal" })).toBeVisible();
    await expect(page.getByText(/Google Agenda · sincronizada/)).toBeVisible();
    // sincronizada há 1 h (> 2 min): pede uma sincronização ao abrir
    await expect.poll(() => chamadas.filter((c) => c === "sincronizar").length).toBe(1);
  });

  test("sincronização recente não é repetida ao abrir", async ({ page }) => {
    const chamadas = await abrir(page, conectado("2026-10-07T17:59:30Z"));
    await expect(page.getByText(/sincronizada agora há pouco/)).toBeVisible();
    await page.waitForTimeout(500);
    expect(chamadas).toHaveLength(0);
    await page.getByRole("button", { name: "Sincronizar agora" }).click();
    await expect.poll(() => chamadas.length).toBe(1);
  });

  test("tocar num evento abre os detalhes, somente leitura", async ({ page }) => {
    await abrir(page, conectado());
    await page.getByRole("button", { name: "Plantão na central, 09:00–11:00" }).click();
    const folha = page.getByRole("dialog", { name: "Evento do Google Agenda" });
    await expect(folha.getByText("09:00 – 11:00")).toBeVisible();
    await expect(folha.getByText("Pessoal")).toBeVisible();
    await expect(folha.getByText("Somente leitura: edite no Google Agenda.")).toBeVisible();
  });

  test("trocar de dia pela faixa e navegar semanas", async ({ page }) => {
    await abrir(page, conectado());
    await page
      .getByRole("group", { name: "Dias da semana" })
      .getByRole("button", { name: /^sexta-feira/ })
      .click();
    await expect(page.getByRole("region", { name: /^Agenda de sexta-feira/ })).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Almoço em família, 12:00–13:30" }),
    ).toBeVisible();
    await expect(page.getByRole("button", { name: /^Plantão/ })).toHaveCount(0);

    await page.getByRole("button", { name: "Próxima semana" }).click();
    await expect(
      page.getByRole("group", { name: "Dias da semana" }).getByRole("button", { name: /dia 16/ }),
    ).toBeVisible();
    await page.getByRole("button", { name: "Hoje", exact: true }).click();
    await expect(page.getByRole("region", { name: /^Agenda de quarta-feira/ })).toBeVisible();
  });

  test("acesso expirado pede para reconectar", async ({ page }) => {
    const estado = conectado();
    estado.google.conexao!.status = "needs_reauth";
    await abrir(page, estado);
    await expect(page.getByText("O acesso ao Google Agenda expirou.")).toBeVisible();
    await expect(page.getByRole("link", { name: "Reconectar" })).toHaveAttribute(
      "href",
      "/api/google/conectar",
    );
  });

  test("falha na sincronização avisa sem quebrar a tela", async ({ page }) => {
    await abrir(page, conectado(), { status: "erro" });
    await expect(page.getByText("Não deu pra sincronizar com o Google")).toBeVisible();
    await expect(page.getByRole("button", { name: /^Plantão/ })).toBeVisible();
  });
});

test.describe("Personalização › Google Agenda", () => {
  test("não conectado: botão leva ao fluxo de permissão do servidor", async ({ page }) => {
    await prepararTela(page, cenarioPadrao());
    await page.goto("/dev/personalizacao");
    const secao = page.getByRole("region", { name: "Google Agenda" });
    await expect(secao.getByText("Não conectado")).toBeVisible();
    await expect(secao.getByRole("link", { name: "Conectar Google Agenda" })).toHaveAttribute(
      "href",
      "/api/google/conectar",
    );
  });

  test("ligar uma agenda salva e sincroniza; desconectar apaga", async ({ page }) => {
    const estado = conectado();
    await prepararTela(page, estado);
    const chamadas = await instalarApiGoogleFalsa(page, estado);
    await page.goto("/dev/personalizacao");
    const secao = page.getByRole("region", { name: "Google Agenda" });
    const trabalho = secao.getByRole("switch", { name: /Trabalho/ });
    await expect(trabalho).toHaveAttribute("aria-checked", "false");
    await trabalho.click();
    await expect(trabalho).toHaveAttribute("aria-checked", "true");
    await expect
      .poll(() => estado.google.agendas.find((a) => a.summary === "Trabalho")!.enabled)
      .toBe(true);
    await expect.poll(() => chamadas.includes("sincronizar")).toBe(true);

    await secao.getByRole("button", { name: "Desconectar e apagar eventos importados" }).click();
    await expect(secao.getByText("Não conectado")).toBeVisible();
    expect(chamadas).toContain("desconectar");
  });

  test("volta da tela do Google com permissões negadas mostra a orientação", async ({ page }) => {
    await prepararTela(page, cenarioPadrao());
    await page.goto("/dev/personalizacao?google=permissoes");
    await expect(page.getByText("marque as duas permissões de leitura")).toBeVisible();
  });
});
