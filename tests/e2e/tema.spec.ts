import { expect, test, type Page } from "@playwright/test";
import { COOKIE_TEMA, definirCookieDeTema, fundoEsperado, type Tema } from "./apoio-tema";

const TEMAS: Tema[] = ["ponderosa", "burgundy", "camel", "amethyst", "volt"];

/** Espera o primeiro quadro ser registrado (ele acontece logo após o carregamento) e devolve a cor. */
async function lerPrimeiroFundo(page: Page): Promise<string | undefined> {
  await page.waitForFunction(
    () => (window as unknown as { __primeiroFundo?: string }).__primeiroFundo !== undefined,
  );
  return page.evaluate(() => (window as unknown as { __primeiroFundo?: string }).__primeiroFundo);
}

/**
 * Registra, ANTES de qualquer script da página rodar, a cor de fundo que o navegador
 * está prestes a PINTAR no primeiro quadro. Se aparecesse o tema errado por um instante
 * ("flash"), este valor seria o do tema errado.
 */
const REGISTRAR_PRIMEIRO_QUADRO = () => {
  const w = window as unknown as { __primeiroFundo?: string; __fundos?: string[] };
  w.__fundos = [];
  requestAnimationFrame(() => {
    w.__primeiroFundo = getComputedStyle(document.documentElement).backgroundColor;
  });
  // Guarda também todas as mudanças de data-theme, para provar que não oscilou.
  new MutationObserver(() => {
    w.__fundos?.push(getComputedStyle(document.documentElement).backgroundColor);
  }).observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
};

test.describe("tema salvo no cookie: sem flash do tema errado", () => {
  for (const tema of TEMAS) {
    test(`abre direto em ${tema}`, async ({ page, context }) => {
      await definirCookieDeTema(context, tema);
      await page.addInitScript(REGISTRAR_PRIMEIRO_QUADRO);
      await page.goto("/dev/temas");

      await expect(page.locator("html")).toHaveAttribute("data-theme", tema);
      const primeiro = await lerPrimeiroFundo(page);
      expect(primeiro, "cor pintada no primeiro quadro").toBe(fundoEsperado(tema));
    });
  }
});

test.describe('sem cookie: "auto" segue o claro/escuro do aparelho', () => {
  test.describe("aparelho escuro", () => {
    test.use({ colorScheme: "dark" });
    test("abre em ponderosa", async ({ page }) => {
      await page.addInitScript(REGISTRAR_PRIMEIRO_QUADRO);
      await page.goto("/dev/temas");
      await expect(page.locator("html")).toHaveAttribute("data-theme", "auto");
      const primeiro = await lerPrimeiroFundo(page);
      expect(primeiro).toBe(fundoEsperado("ponderosa"));
    });
  });

  test.describe("aparelho claro", () => {
    test.use({ colorScheme: "light" });
    test("abre em camel", async ({ page }) => {
      await page.addInitScript(REGISTRAR_PRIMEIRO_QUADRO);
      await page.goto("/dev/temas");
      const primeiro = await lerPrimeiroFundo(page);
      expect(primeiro).toBe(fundoEsperado("camel"));
    });
  });
});

test.describe("trocar de tema", () => {
  test("clicar troca na hora, grava o cookie e persiste ao recarregar", async ({
    page,
    context,
  }) => {
    await page.goto("/dev/temas");
    await page.getByTestId("tema-burgundy").click();

    await expect(page.locator("html")).toHaveAttribute("data-theme", "burgundy");
    await expect(page.getByTestId("tema-burgundy")).toHaveAttribute("aria-checked", "true");

    const cookies = await context.cookies();
    expect(cookies.find((c) => c.name === COOKIE_TEMA)?.value).toBe("burgundy");

    await page.reload();
    await expect(page.locator("html")).toHaveAttribute("data-theme", "burgundy");
    await expect(page.getByTestId("tema-burgundy")).toHaveAttribute("aria-checked", "true");
  });

  test("cookie com valor inválido é ignorado (cai no automático)", async ({ page, context }) => {
    await definirCookieDeTema(context, "roxo");
    await page.goto("/dev/temas");
    await expect(page.locator("html")).toHaveAttribute("data-theme", "auto");
  });

  test("a barra do navegador acompanha o tema escolhido", async ({ page }) => {
    await page.goto("/dev/temas");
    await page.getByTestId("tema-camel").click();
    const cor = await page.locator('meta[name="theme-color"]').first().getAttribute("content");
    expect(cor).toBe("#f3ebdd");
  });
});
