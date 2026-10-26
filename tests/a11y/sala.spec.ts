import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { cenarioPadrao, prepararTela, USUARIO } from "../e2e/apoio-supabase-falso";
import { definirCookieDeTema } from "../e2e/apoio-tema";

/** Acessibilidade (WCAG 2.2 AA) da Sala pixel nos 8 temas: sala sem pet, com pet, a adoção e o
 *  editor do avatar. */
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
    test("sala sem pet e a folha de adoção", async ({ page, context }) => {
      await definirCookieDeTema(context, tema);
      await prepararTela(page, cenarioPadrao());
      await page.goto("/dev/sala");
      await expect(page.getByText("Você ainda não tem um pet")).toBeVisible();
      expect(await auditar(page)).toEqual([]);
      await page.getByRole("button", { name: "Adotar um pet" }).first().click();
      await expect(page.getByRole("dialog", { name: "Adotar um pet" })).toBeVisible();
      await page.waitForTimeout(450); // fim da animação da folha
      expect(await auditar(page)).toEqual([]);
    });

    test("sala com pet (cada espécie) e a folha de edição", async ({ page, context }) => {
      await definirCookieDeTema(context, tema);
      const estado = cenarioPadrao();
      estado.pixel = {
        user_id: USUARIO,
        pet_species: "gato_banana",
        pet_variant: "amarela",
        pet_name: "Banana",
        avatar: {},
      };
      await prepararTela(page, estado);
      await page.goto("/dev/sala");
      await expect(page.getByRole("button", { name: "Fazer carinho em Banana" })).toBeVisible();
      expect(await auditar(page)).toEqual([]);
      await page.getByRole("button", { name: "Fazer carinho em Banana" }).click();
      expect(await auditar(page)).toEqual([]);
      await page.getByRole("button", { name: "Editar pet" }).click();
      await expect(page.getByRole("dialog", { name: "Editar pet" })).toBeVisible();
      await page.waitForTimeout(450);
      expect(await auditar(page)).toEqual([]);
    });

    test("editor do avatar: as 3 abas (com item trancado)", async ({ page, context }) => {
      await definirCookieDeTema(context, tema);
      await prepararTela(page, cenarioPadrao());
      await page.goto("/dev/sala");
      await page.getByRole("button", { name: "Editar avatar" }).click();
      const folha = page.getByRole("dialog", { name: "Seu avatar" });
      await expect(folha).toBeVisible();
      await page.waitForTimeout(450);
      expect(await auditar(page)).toEqual([]);
      for (const aba of ["Itens", "Conjuntos"]) {
        await folha.getByRole("tab", { name: aba }).click();
        await expect(folha.getByRole("tab", { name: aba })).toHaveAttribute(
          "aria-selected",
          "true",
        );
        await page.waitForTimeout(300); // fim da transição de cor do texto da aba
        expect(await auditar(page), aba).toEqual([]);
      }
    });
  });
}

test("laboratório de arte pixel", async ({ page }) => {
  await page.goto("/dev/pixel");
  await expect(page.getByRole("heading", { name: "Arte pixel", level: 1 })).toBeVisible();
  expect(await auditar(page)).toEqual([]);
});
