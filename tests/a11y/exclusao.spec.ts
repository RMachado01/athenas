import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { cenarioPadrao, prepararTela } from "../e2e/apoio-supabase-falso";
import { definirCookieDeTema } from "../e2e/apoio-tema";

/** Acessibilidade (WCAG 2.2 AA) do menu "⋯" e da confirmação de exclusão, nos 8 temas. */
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

for (const tema of TEMAS) {
  test.describe(`tema ${tema}`, () => {
    test("lista de murais: menu e confirmação de exclusão", async ({ page, context }) => {
      await definirCookieDeTema(context, tema);
      const estado = cenarioPadrao();
      estado.murais.boards = [
        {
          id: "00000000-0000-4000-8000-00000000b001",
          title: "Plano de SQL",
          color: "azul",
          icon: "brain",
          track_id: null,
          viewport: { x: 0, y: 0, zoom: 1 },
          archived_at: null,
          updated_at: "2026-10-07T12:00:00Z",
        },
      ];
      await prepararTela(page, estado);
      await page.goto("/dev/murais");
      const abrir = page.getByRole("button", { name: "Opções do mural Plano de SQL" });
      await expect(abrir).toBeVisible();
      expect(await auditar(page)).toEqual([]);
      await abrir.click();
      await expect(page.getByRole("menuitem", { name: "Excluir…" })).toBeVisible();
      // (Com o menu aberto o Radix esconde a página atrás dele; não auditamos esse instante.)
      await page.getByRole("menuitem", { name: "Excluir…" }).click();
      await expect(page.getByRole("alertdialog", { name: "Excluir este mural?" })).toBeVisible();
      await page.waitForTimeout(300);
      expect(await auditar(page)).toEqual([]);
    });

    test("lista de notas: menu e confirmação de exclusão", async ({ page, context }) => {
      await definirCookieDeTema(context, tema);
      const estado = cenarioPadrao();
      estado.notas.notas = [
        {
          id: "00000000-0000-4000-8000-00000000e001",
          title: "SQL básico",
          icon: null,
          content: { type: "doc", content: [] },
          plain_text: "Comandos essenciais",
          track_id: null,
          archived_at: null,
          updated_at: "2026-10-07T12:00:00Z",
        },
      ];
      await prepararTela(page, estado);
      await page.goto("/dev/notas");
      const abrir = page.getByRole("button", { name: "Opções da nota SQL básico" });
      await expect(abrir).toBeVisible();
      expect(await auditar(page)).toEqual([]);
      await abrir.click();
      await page.getByRole("menuitem", { name: "Excluir…" }).click();
      await expect(page.getByRole("alertdialog", { name: "Excluir esta nota?" })).toBeVisible();
      await page.waitForTimeout(300);
      expect(await auditar(page)).toEqual([]);
    });

    test("folhas de arquivados (murais e notas)", async ({ page, context }) => {
      await definirCookieDeTema(context, tema);
      const estado = cenarioPadrao();
      estado.murais.boards = [
        {
          id: "00000000-0000-4000-8000-00000000b009",
          title: "Mural antigo",
          color: "rosa",
          icon: "brain",
          track_id: null,
          viewport: { x: 0, y: 0, zoom: 1 },
          archived_at: "2026-10-10T12:00:00Z",
          updated_at: "2026-10-09T12:00:00Z",
        },
      ];
      estado.notas.notas = [
        {
          id: "00000000-0000-4000-8000-00000000e009",
          title: "Nota antiga",
          icon: null,
          content: { type: "doc", content: [] },
          plain_text: "",
          track_id: null,
          archived_at: "2026-10-10T12:00:00Z",
          updated_at: "2026-10-09T12:00:00Z",
        },
      ];
      await prepararTela(page, estado);
      await page.goto("/dev/murais");
      await page.getByRole("button", { name: /^Arquivados · 1/ }).click();
      await expect(page.getByRole("dialog", { name: "Murais arquivados" })).toBeVisible();
      await page.waitForTimeout(450);
      expect(await auditar(page)).toEqual([]);
      await page.goto("/dev/notas");
      await page.getByRole("button", { name: /^Arquivadas · 1/ }).click();
      await expect(page.getByRole("dialog", { name: "Notas arquivadas" })).toBeVisible();
      await page.waitForTimeout(450);
      expect(await auditar(page)).toEqual([]);
    });
  });
}
