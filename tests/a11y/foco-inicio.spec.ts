import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { cenarioPadrao, instalarApiGoogleFalsa, prepararTela } from "../e2e/apoio-supabase-falso";
import { definirCookieDeTema } from "../e2e/apoio-tema";

/** Acessibilidade (WCAG 2.2 AA) do Início e do Foco em todos os temas. */
const TEMAS = ["ponderosa", "burgundy", "camel", "amethyst", "volt", "mono", "amber", "auto"];

test.use({ reducedMotion: "reduce" });

async function auditar(page: Page) {
  const resultado = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
    .analyze();
  return resultado.violations.map(
    (v) => `${v.id}: ${v.help} -> ${v.nodes.map((n) => n.target.join(" ")).join(" | ")}`,
  );
}

/** Cenário com histórico de estudo, para o mapa de calor e o gráfico terem o que mostrar. */
function cenarioComFoco() {
  const estado = cenarioPadrao();
  estado.diasDeFoco = [
    { dia: "2026-10-07", minutos: 50, sessoes: 2 },
    { dia: "2026-10-06", minutos: 130, sessoes: 5 },
    { dia: "2026-10-05", minutos: 25, sessoes: 1 },
    { dia: "2026-10-02", minutos: 75, sessoes: 3 },
    { dia: "2026-09-28", minutos: 200, sessoes: 8 },
    { dia: "2026-09-10", minutos: 40, sessoes: 2 },
  ];
  estado.sequencia = { atual: 3, melhor: 5 };
  estado.metas = [
    {
      id: "00000000-0000-4000-8000-0000000000b1",
      title: "5 h de foco por semana",
      kind: "minutos",
      period: "semana",
      target: 300,
      track_id: null,
      atual: 120,
      archived: false,
    },
    {
      id: "00000000-0000-4000-8000-0000000000b2",
      title: "10 tarefas",
      kind: "tarefas",
      period: "mes",
      target: 10,
      track_id: null,
      atual: 10,
      archived: false,
    },
  ];
  return estado;
}

for (const tema of TEMAS) {
  test.describe(`tema ${tema}`, () => {
    test("Início", async ({ page, context }) => {
      await definirCookieDeTema(context, tema);
      await prepararTela(page, cenarioComFoco());
      await page.goto("/dev/inicio");
      await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
      await expect(page.getByRole("link", { name: /^Foco:/ })).toBeVisible();
      expect(await auditar(page)).toEqual([]);
    });

    test("Personalização", async ({ page, context }) => {
      await definirCookieDeTema(context, tema);
      await prepararTela(page, cenarioComFoco());
      await page.goto("/dev/personalizacao");
      await expect(page.getByRole("heading", { name: "Personalização", level: 1 })).toBeVisible();
      await expect(page.getByLabel(/^Meta diária/)).toBeVisible();
      expect(await auditar(page)).toEqual([]);
    });

    test("Metas com a folha de nova meta", async ({ page, context }) => {
      await definirCookieDeTema(context, tema);
      await prepararTela(page, cenarioComFoco());
      await page.goto("/dev/metas");
      await expect(page.getByRole("article")).toHaveCount(2);
      expect(await auditar(page)).toEqual([]);
      await page.getByRole("button", { name: "Nova meta" }).click();
      await expect(page.getByRole("dialog", { name: "Nova meta" })).toBeVisible();
      expect(await auditar(page)).toEqual([]);
    });

    test("Agenda com eventos do Google", async ({ page, context }) => {
      await definirCookieDeTema(context, tema);
      const estado = cenarioComFoco();
      estado.google = {
        conexao: { status: "active", last_synced_at: "2026-10-07T17:59:00Z", last_error: null },
        agendas: [
          {
            google_calendar_id: "eu",
            summary: "Pessoal",
            color: "#4285f4",
            is_primary: true,
            enabled: true,
          },
        ],
        eventos: [
          {
            id: "e1",
            google_calendar_id: "eu",
            title: "Plantão na central",
            all_day: false,
            starts_at: "2026-10-07T16:00:00Z",
            ends_at: "2026-10-07T18:00:00Z",
            start_date: null,
            end_date: null,
          },
          {
            id: "e2",
            google_calendar_id: "eu",
            title: "Feriado",
            all_day: true,
            starts_at: null,
            ends_at: null,
            start_date: "2026-10-07",
            end_date: "2026-10-08",
          },
        ],
      };
      await prepararTela(page, estado);
      await instalarApiGoogleFalsa(page, estado);
      await page.goto("/dev/agenda");
      await expect(page.getByRole("button", { name: /^Plantão na central/ })).toBeVisible();
      expect(await auditar(page)).toEqual([]);
    });

    test("Foco", async ({ page, context }) => {
      await definirCookieDeTema(context, tema);
      await prepararTela(page, cenarioComFoco());
      await page.goto("/dev/foco");
      await expect(page.getByRole("heading", { name: "Foco", level: 1 })).toBeVisible();
      await expect(page.getByRole("timer")).toHaveText("25:00");
      expect(await auditar(page)).toEqual([]);
    });
  });
}
