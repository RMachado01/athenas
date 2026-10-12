import { expect, test, type Page } from "@playwright/test";
import { cenarioPadrao, prepararTela, type EstadoFalso } from "./apoio-supabase-falso";
import { COOKIE_TEMA } from "./apoio-tema";

/** Fluxos da tela de Personalização com o Supabase falso em memória. */
async function abrir(page: Page, estado: EstadoFalso = cenarioPadrao()) {
  await prepararTela(page, estado);
  await page.goto("/dev/personalizacao");
  await expect(page.getByRole("heading", { name: "Personalização", level: 1 })).toBeVisible();
  return estado;
}

const patchesDoPerfil = (estado: EstadoFalso) =>
  estado.requisicoes.filter((r) => r.tabela === "profiles" && r.metodo === "PATCH");

test.describe("tema", () => {
  test("mostra os 7 temas + automático e marca o atual", async ({ page }) => {
    await abrir(page);
    const grupo = page.getByRole("radiogroup", { name: "Tema" });
    await expect(grupo.getByRole("radio")).toHaveCount(8);
    await expect(grupo.getByRole("radio", { name: /^Automático/ })).toHaveAttribute(
      "aria-checked",
      "true",
    );
  });

  test("escolher aplica na hora, grava o cookie e salva no perfil", async ({ page, context }) => {
    const estado = await abrir(page);
    await page.getByTestId("tema-mono").click();

    await expect(page.locator("html")).toHaveAttribute("data-theme", "mono");
    await expect(page.getByTestId("tema-mono")).toHaveAttribute("aria-checked", "true");
    const cookies = await context.cookies();
    expect(cookies.find((c) => c.name === COOKIE_TEMA)?.value).toBe("mono");
    await expect.poll(() => patchesDoPerfil(estado).length).toBeGreaterThan(0);
    expect(patchesDoPerfil(estado).at(-1)!.corpo).toEqual({ theme: "mono" });
  });

  test("aparelho novo (sem cookie) adota o tema salvo no perfil", async ({ page }) => {
    const estado = cenarioPadrao();
    estado.perfil.theme = "amber";
    await abrir(page, estado);
    await expect(page.locator("html")).toHaveAttribute("data-theme", "amber");
  });

  test("com cookie neste aparelho, a escolha local vence o perfil", async ({ page, context }) => {
    await context.addCookies([{ name: COOKIE_TEMA, value: "camel", url: "http://localhost:3112" }]);
    const estado = cenarioPadrao();
    estado.perfil.theme = "amber";
    await abrir(page, estado);
    await expect(page.locator("html")).toHaveAttribute("data-theme", "camel");
  });
});

test.describe("rede lenta", () => {
  test("tocar antes do perfil chegar ainda salva (espera o perfil)", async ({ page }) => {
    const estado = cenarioPadrao();
    estado.atrasoDoPerfilMs = 1500;
    await prepararTela(page, estado);
    await page.goto("/dev/personalizacao");
    await page
      .getByRole("radiogroup", { name: "Animações" })
      .getByRole("radio", { name: /Reduzido/ })
      .click();
    await expect.poll(() => patchesDoPerfil(estado).length, { timeout: 8000 }).toBeGreaterThan(0);
    expect(patchesDoPerfil(estado).at(-1)!.corpo).toEqual({ motion: "reduced" });
    await expect(page.locator("html")).toHaveAttribute("data-motion", "reduced", { timeout: 8000 });
  });
});

test.describe("movimento", () => {
  test("escolher Reduzido liga data-motion e salva", async ({ page }) => {
    const estado = await abrir(page);
    await page
      .getByRole("radiogroup", { name: "Animações" })
      .getByRole("radio", { name: /Reduzido/ })
      .click();
    await expect(page.locator("html")).toHaveAttribute("data-motion", "reduced");
    await expect.poll(() => patchesDoPerfil(estado).length).toBeGreaterThan(0);
    expect(patchesDoPerfil(estado).at(-1)!.corpo).toEqual({ motion: "reduced" });

    await page
      .getByRole("radiogroup", { name: "Animações" })
      .getByRole("radio", { name: /Automático/ })
      .click();
  });
});

test.describe("estudo", () => {
  test("lê os valores do perfil", async ({ page }) => {
    await abrir(page);
    await expect(page.getByLabel(/^Meta diária/)).toHaveValue("120");
    await expect(page.getByLabel(/^Foco\s*Duração/)).toHaveValue("25");
    await expect(page.getByLabel(/^Focos por ciclo/)).toHaveValue("4");
  });

  test("valor válido é salvo ao sair do campo", async ({ page }) => {
    const estado = await abrir(page);
    const campo = page.getByLabel(/^Foco\s*Duração/);
    await campo.fill("50");
    await campo.press("Enter");
    await expect.poll(() => patchesDoPerfil(estado).length).toBeGreaterThan(0);
    expect(patchesDoPerfil(estado).at(-1)!.corpo).toEqual({ pomodoro_focus_min: 50 });
    await expect(campo).toHaveValue("50");
  });

  test("valor inválido mostra erro e não salva", async ({ page }) => {
    const estado = await abrir(page);
    const campo = page.getByLabel(/^Pausa curta/);
    await campo.fill("999");
    await campo.press("Enter");
    await expect(page.locator("p[role=alert]")).toHaveText("Use um valor entre 1 e 60.");
    expect(patchesDoPerfil(estado)).toHaveLength(0);

    await campo.fill("abc");
    await campo.press("Enter");
    await expect(page.locator("p[role=alert]")).toHaveText("Digite um número inteiro.");
  });

  test("Esc descarta a edição", async ({ page }) => {
    const estado = await abrir(page);
    const campo = page.getByLabel(/^Meta diária/);
    await campo.fill("300");
    await campo.press("Escape");
    await expect(campo).toHaveValue("120");
    expect(patchesDoPerfil(estado)).toHaveLength(0);
  });

  test("falha ao salvar volta ao valor anterior e avisa", async ({ page }) => {
    const estado = await abrir(page);
    estado.falharEscritas = true;
    const campo = page.getByLabel(/^Meta diária/);
    await campo.fill("200");
    await campo.press("Enter");
    await expect(page.getByText("Não consegui salvar essa preferência")).toBeVisible();
    await expect(campo).toHaveValue("120");
  });
});
