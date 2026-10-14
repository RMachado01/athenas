import { expect, test, type Page } from "@playwright/test";
import { cenarioPadrao, prepararTela } from "./apoio-supabase-falso";

/**
 * Polimento para publicar (auditoria de design): app instalável, aviso acima da barra, campos
 * sem zoom no iPhone, desfoque só no "chrome", folhas animadas e alvos de toque de 44 px.
 */

async function abrirTarefas(page: Page) {
  await prepararTela(page, cenarioPadrao());
  await page.goto("/dev/tarefas");
  await expect(page.getByText(/\d+ abertas? · \d+ atrasadas?/)).toBeVisible();
}

test.describe("app instalável (PWA)", () => {
  test("manifesto com nome, modo app e ícones 192/512/maskable", async ({ request }) => {
    const resposta = await request.get("/manifest.webmanifest");
    expect(resposta.ok()).toBe(true);
    const m = (await resposta.json()) as {
      name: string;
      short_name: string;
      display: string;
      start_url: string;
      icons: { src: string; sizes: string; purpose?: string }[];
    };
    expect(m).toMatchObject({ name: "Athenas", short_name: "Athenas", display: "standalone" });
    expect(m.start_url).toBe("/");
    const tamanhos = m.icons.map((i) => `${i.sizes}${i.purpose === "maskable" ? " maskable" : ""}`);
    expect(tamanhos).toEqual(expect.arrayContaining(["192x192", "512x512", "512x512 maskable"]));
    for (const icone of m.icons) {
      const img = await request.get(icone.src);
      expect(img.ok(), icone.src).toBe(true);
      expect(img.headers()["content-type"]).toContain("image/png");
    }
  });

  test("página aponta o manifesto, o ícone da Apple e usa a tela toda (viewport-fit)", async ({
    page,
  }) => {
    await page.goto("/login");
    await expect(page.locator('link[rel="manifest"]')).toHaveAttribute("href", /manifest/);
    await expect(page.locator('link[rel="apple-touch-icon"]').first()).toHaveAttribute(
      "href",
      /.+/,
    );
    await expect(page.locator('meta[name="viewport"]')).toHaveAttribute(
      "content",
      /viewport-fit=cover/,
    );
  });
});

test.describe("toques e leitura no celular", () => {
  test("aviso (toast) aparece ACIMA da barra de navegação", async ({ page }) => {
    await abrirTarefas(page);
    await page.getByRole("button", { name: /^Concluir tarefa: Window functions/ }).click();
    const aviso = page.locator("[data-sonner-toast]").first();
    await expect(aviso).toBeVisible();
    const barra = (await page.getByRole("navigation", { name: "Principal" }).boundingBox())!;
    // O aviso entra deslizando de baixo: mede depois que a animação de entrada termina.
    await expect
      .poll(async () => {
        const caixa = (await aviso.boundingBox())!;
        return caixa.y + caixa.height;
      })
      .toBeLessThanOrEqual(barra.y);
  });

  test("campos de texto com pelo menos 16 px (o iPhone não dá zoom ao tocar)", async ({ page }) => {
    await abrirTarefas(page);
    await page.getByRole("button", { name: /^Window functions/ }).click();
    await expect(page.getByRole("dialog", { name: "Detalhes da tarefa" })).toBeVisible();
    const pequenos = await page.evaluate(() =>
      [...document.querySelectorAll<HTMLElement>("input, textarea, select")]
        .filter(
          (el) =>
            el.offsetParent !== null &&
            !["checkbox", "radio"].includes((el as HTMLInputElement).type),
        )
        .filter((el) => parseFloat(getComputedStyle(el).fontSize) < 16)
        .map((el) => el.getAttribute("aria-label") ?? el.id ?? el.outerHTML.slice(0, 60)),
    );
    expect(pequenos).toEqual([]);
  });

  test("desfoque só no chrome: cartões de conteúdo sem backdrop-filter, folhas com", async ({
    page,
  }) => {
    await abrirTarefas(page);
    const filtroDoCartao = await page
      .locator(".cartao")
      .first()
      .evaluate((el) => getComputedStyle(el).backdropFilter);
    expect(filtroDoCartao).toBe("none");
    const filtroDaBarra = await page
      .getByRole("navigation", { name: "Principal" })
      .evaluate((el) => {
        const comVidro =
          el.closest(".vidro, .vidro-forte") ?? el.querySelector(".vidro, .vidro-forte");
        return comVidro ? getComputedStyle(comVidro).backdropFilter : "sem vidro";
      });
    expect(filtroDaBarra).toContain("blur");
  });

  test("botões do Início e das Tarefas têm alvo de toque de pelo menos 44 px", async ({ page }) => {
    const medir = () =>
      page.evaluate(() =>
        [...document.querySelectorAll<HTMLElement>("main button, main a[href]")]
          .filter((el) => el.offsetParent !== null)
          .filter((el) => {
            const r = el.getBoundingClientRect();
            return r.height < 44 || r.width < 44;
          })
          .map((el) => (el.getAttribute("aria-label") ?? el.textContent ?? "").trim().slice(0, 40)),
      );
    await prepararTela(page, cenarioPadrao());
    await page.goto("/dev/inicio");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await expect(page.getByRole("region", { name: "Resumo" })).toBeVisible();
    expect(await medir()).toEqual([]);
    await abrirTarefas(page);
    expect(await medir()).toEqual([]);
  });
});

test.describe("movimento", () => {
  test.use({ reducedMotion: "no-preference" });

  test("folha inferior entra com animação (e o fundo escurece com fade)", async ({ page }) => {
    await abrirTarefas(page);
    await page.getByRole("button", { name: "Nova tarefa" }).click();
    const folha = page.getByRole("dialog");
    await expect(folha).toBeVisible();
    const animacao = await folha.evaluate((el) => getComputedStyle(el).animationName);
    expect(animacao).not.toBe("none");
  });
});

test.describe("escolhas sem <select> nativo", () => {
  test("lista curta: trilhas em pílulas, um toque escolhe", async ({ page }) => {
    await prepararTela(page, cenarioPadrao());
    await page.goto("/dev/flashcards");
    await page.getByRole("button", { name: "Criar meu primeiro baralho" }).click();
    const folha = page.getByRole("dialog", { name: "Novo baralho" });
    await expect(folha.locator("select")).toHaveCount(0);
    const trilhas = folha.getByRole("radiogroup", { name: "Trilha (opcional)" });
    await trilhas.getByRole("radio", { name: "Python" }).click();
    await expect(trilhas.getByRole("radio", { name: "Python" })).toBeChecked();
    await expect(trilhas.getByRole("radio", { name: "Nenhuma" })).not.toBeChecked();
  });

  test("lista longa: abre uma folha com busca e mostra a escolha no botão", async ({ page }) => {
    const estado = cenarioPadrao();
    for (let i = 1; i <= 12; i++) {
      estado.tarefas.push({
        ...estado.tarefas[0]!,
        id: `00000000-0000-4000-8000-0000000a${String(i).padStart(4, "0")}`,
        title: `Exercício ${i}`,
        status: "todo",
        parent_id: null,
      });
    }
    await prepararTela(page, estado);
    await page.goto("/dev/foco");
    await expect(page.locator("select")).toHaveCount(0);
    await page.getByRole("button", { name: /^Em qual tarefa você vai trabalhar\?/ }).click();
    const folha = page.getByRole("dialog", { name: "Em qual tarefa você vai trabalhar?" });
    await folha.getByRole("searchbox", { name: "Buscar" }).fill("exercício 12");
    await folha.getByRole("radio", { name: "Exercício 12" }).click();
    await expect(folha).toHaveCount(0);
    await expect(
      page.getByRole("button", { name: "Em qual tarefa você vai trabalhar?: Exercício 12" }),
    ).toBeVisible();
  });
});
