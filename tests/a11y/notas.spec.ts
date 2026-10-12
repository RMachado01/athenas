import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { cenarioPadrao, prepararTela } from "../e2e/apoio-supabase-falso";
import { definirCookieDeTema } from "../e2e/apoio-tema";

/** Acessibilidade (WCAG 2.2 AA) das Notas: lista e editor com blocos, link e backlinks. */
const TEMAS = ["ponderosa", "burgundy", "camel", "amethyst", "volt", "mono", "amber", "auto"];
const A = "00000000-0000-4000-8000-00000000e001";
const B = "00000000-0000-4000-8000-00000000e002";

test.use({ reducedMotion: "reduce" });

async function auditar(page: Page) {
  const resultado = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
    .analyze();
  return resultado.violations.map(
    (v) => `${v.id}: ${v.help} -> ${v.nodes.map((n) => n.target.join(" ")).join(" | ")}`,
  );
}

function cenario() {
  const estado = cenarioPadrao();
  const base = {
    icon: null,
    track_id: null,
    archived_at: null,
    updated_at: "2026-10-07T12:00:00Z",
  };
  estado.notas.notas = [
    {
      ...base,
      id: A,
      title: "SQL básico",
      plain_text: "Comandos essenciais. Ver JOINs.",
      content: {
        type: "doc",
        content: [
          { type: "heading", attrs: { level: 2 }, content: [{ type: "text", text: "Comandos" }] },
          {
            type: "paragraph",
            content: [
              { type: "text", text: "Ver também " },
              { type: "wikilink", attrs: { id: B, label: "JOINs" } },
            ],
          },
          {
            type: "bulletList",
            content: [
              {
                type: "listItem",
                content: [{ type: "paragraph", content: [{ type: "text", text: "SELECT" }] }],
              },
            ],
          },
          {
            type: "taskList",
            content: [
              {
                type: "taskItem",
                attrs: { checked: true },
                content: [
                  { type: "paragraph", content: [{ type: "text", text: "Revisar WHERE" }] },
                ],
              },
            ],
          },
          {
            type: "blockquote",
            content: [
              {
                type: "paragraph",
                content: [{ type: "text", text: "Dados são o novo petróleo." }],
              },
            ],
          },
          { type: "codeBlock", content: [{ type: "text", text: "select * from tasks;" }] },
        ],
      },
    },
    {
      ...base,
      id: B,
      title: "JOINs",
      plain_text: "INNER, LEFT",
      content: { type: "doc", content: [] },
    },
  ];
  estado.notas.links = [{ from_note: A, to_note: B }];
  return estado;
}

for (const tema of TEMAS) {
  test.describe(`tema ${tema}`, () => {
    test("lista de notas", async ({ page, context }) => {
      await definirCookieDeTema(context, tema);
      await prepararTela(page, cenario());
      await page.goto("/dev/notas");
      await expect(page.getByRole("link", { name: /SQL básico/ })).toBeVisible();
      expect(await auditar(page)).toEqual([]);
    });

    test("editor com blocos e link; nota citada com backlink", async ({ page, context }) => {
      await definirCookieDeTema(context, tema);
      await prepararTela(page, cenario());
      await page.goto(`/dev/notas/${A}`);
      await expect(page.locator("a.wikilink")).toHaveText("JOINs");
      expect(await auditar(page)).toEqual([]);
      await page.goto(`/dev/notas/${B}`);
      await expect(page.getByRole("region", { name: /Citada em 1 nota/ })).toBeVisible();
      expect(await auditar(page)).toEqual([]);
    });
  });
}
