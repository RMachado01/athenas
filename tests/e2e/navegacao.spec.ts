import { expect, test, type Page } from "@playwright/test";
import { cenarioPadrao, prepararTela } from "./apoio-supabase-falso";

/**
 * Navegação e transições (auditoria de design, itens 6, 7, 10, 11 e 15) e cabeçalhos de
 * segurança. Roda no celular (Pixel 7) com o Supabase falso.
 */

const barra = (page: Page) => page.getByRole("navigation", { name: "Principal" });

test.describe("barra de navegação", () => {
  test("mostra o NOME de cada aba (não só o ícone) e o + no meio", async ({ page }) => {
    await prepararTela(page, cenarioPadrao());
    await page.goto("/dev/inicio");
    for (const nome of ["Início", "Tarefas", "Foco", "Estudo"]) {
      await expect(barra(page).getByRole("link", { name: nome })).toBeVisible();
      // Visível de verdade (o texto não está escondido só para leitor de tela).
      await expect(barra(page).getByText(nome, { exact: true })).toBeVisible();
    }
    await expect(barra(page).getByRole("button", { name: "Nova tarefa" })).toBeVisible();
  });

  test("a aba Estudo fica acesa nas telas que moram nela", async ({ page }) => {
    await prepararTela(page, cenarioPadrao());
    for (const tela of ["/dev/estudo", "/dev/notas", "/dev/flashcards", "/dev/metas"]) {
      await page.goto(tela);
      await expect(barra(page).getByRole("link", { name: "Estudo" }), tela).toHaveAttribute(
        "aria-current",
        "page",
      );
    }
    await page.goto("/dev/foco");
    await expect(barra(page).getByRole("link", { name: "Foco" })).toHaveAttribute(
      "aria-current",
      "page",
    );
    await expect(barra(page).getByRole("link", { name: "Estudo" })).not.toHaveAttribute(
      "aria-current",
    );
  });

  test("o menu do avatar não esconde mais Notas, Murais e Flashcards", async ({ page }) => {
    await prepararTela(page, cenarioPadrao());
    await page.goto("/dev/inicio");
    await page.getByRole("button", { name: /^Conta de/ }).click();
    const menu = page.getByRole("menu");
    await expect(menu.getByRole("menuitem", { name: "Personalização" })).toBeVisible();
    await expect(menu.getByRole("menuitem", { name: "Sair" })).toBeVisible();
    await expect(menu.getByRole("menuitem", { name: "Notas" })).toHaveCount(0);
  });
});

test.describe("aba Estudo", () => {
  test("reúne Flashcards, Notas, Murais, Agenda e Metas", async ({ page }) => {
    await prepararTela(page, cenarioPadrao());
    await page.goto("/dev/estudo");
    await expect(page.getByRole("heading", { name: "Estudo", level: 1 })).toBeVisible();
    const principal = page.getByRole("main");
    for (const [nome, destino] of [
      ["Flashcards", "/dev/flashcards"],
      ["Notas", "/dev/notas"],
      ["Murais", "/dev/murais"],
      ["Agenda", "/dev/agenda"],
      ["Metas", "/dev/metas"],
    ] as const) {
      await expect(principal.getByRole("link", { name: new RegExp(`^${nome}`) })).toHaveAttribute(
        "href",
        destino,
      );
    }
  });

  test("leva para a tela escolhida e o foco vai para o título dela", async ({ page }) => {
    await prepararTela(page, cenarioPadrao());
    await page.goto("/dev/estudo");
    await expect(page.getByRole("heading", { name: "Estudo", level: 1 })).toBeVisible();
    await page
      .getByRole("main")
      .getByRole("link", { name: /^Notas/ })
      .click();
    const titulo = page.getByRole("heading", { name: "Notas", level: 1 });
    await expect(titulo).toBeVisible();
    // Leitor de tela anuncia a tela nova: o foco está no h1, não no link de antes.
    await expect(titulo).toBeFocused();
  });
});

test.describe("folha inferior", () => {
  test("arrastar a alça para baixo fecha a folha", async ({ page }) => {
    await prepararTela(page, cenarioPadrao());
    await page.goto("/dev/inicio");
    await barra(page).getByRole("button", { name: "Nova tarefa" }).click();
    const folha = page.getByRole("dialog", { name: "Nova tarefa" });
    await expect(folha).toBeVisible();
    // Espera a animação de subida terminar antes de medir onde está a alça.
    await expect
      .poll(async () => (await folha.boundingBox())?.y ?? 0, { timeout: 2000 })
      .toBeLessThan(800);
    await page.waitForTimeout(450);
    const caixa = (await folha.boundingBox())!;
    const x = caixa.x + caixa.width / 2;
    const y = caixa.y + 8; // a alça fica no topo da folha
    await page.mouse.move(x, y);
    await page.mouse.down();
    await page.mouse.move(x, y + 80, { steps: 5 });
    await page.mouse.move(x, y + 200, { steps: 5 });
    await page.mouse.up();
    await expect(folha).toBeHidden();
  });

  test("arrastar pouco não fecha (a folha volta ao lugar)", async ({ page }) => {
    await prepararTela(page, cenarioPadrao());
    await page.goto("/dev/inicio");
    await barra(page).getByRole("button", { name: "Nova tarefa" }).click();
    const folha = page.getByRole("dialog", { name: "Nova tarefa" });
    await expect(folha).toBeVisible();
    await page.waitForTimeout(450);
    const caixa = (await folha.boundingBox())!;
    const x = caixa.x + caixa.width / 2;
    await page.mouse.move(x, caixa.y + 8);
    await page.mouse.down();
    await page.mouse.move(x, caixa.y + 40, { steps: 20 });
    await page.waitForTimeout(100);
    await page.mouse.up();
    await page.waitForTimeout(300);
    await expect(folha).toBeVisible();
  });
});

test.describe("retorno ao concluir", () => {
  test("concluir tarefa vibra (Android) e o aviso de Desfazer dura 6 s", async ({ page }) => {
    await page.addInitScript(() => {
      (window as unknown as { vibracoes: unknown[] }).vibracoes = [];
      // Troca a vibração de verdade por um "gravador" (no teste não há motor de vibração).
      Object.defineProperty(navigator, "vibrate", {
        value: (p: unknown) => {
          (window as unknown as { vibracoes: unknown[] }).vibracoes.push(p);
          return true;
        },
      });
    });
    await prepararTela(page, cenarioPadrao());
    await page.clock.install({ time: new Date("2026-10-07T15:00:00-03:00") });
    await page.goto("/dev/tarefas");
    await page.getByRole("button", { name: /^Concluir tarefa: Window functions/ }).click();
    expect(
      await page.evaluate(() => (window as unknown as { vibracoes: unknown[] }).vibracoes),
    ).toEqual([12]);
    const aviso = page.locator("[data-sonner-toast]").filter({ hasText: "Tarefa concluída" });
    await expect(aviso).toBeVisible();
    await page.clock.runFor(5000);
    await expect(aviso).toBeVisible(); // com o padrão antigo (4 s) já teria sumido
    await page.clock.runFor(2000);
    await expect(aviso).toBeHidden();
  });
});

test.describe("Personalização", () => {
  test("setas do teclado andam entre os temas e aparece 'Salvo'", async ({ page }) => {
    await prepararTela(page, cenarioPadrao());
    await page.goto("/dev/personalizacao");
    await expect(page.getByLabel(/^Meta diária/)).toHaveValue(/\d+/);
    await page.getByTestId("tema-auto").focus();
    // Segura a tecla um instante, como uma pessoa: o Radix só escolhe se a seta ainda estiver
    // apertada quando o foco chega no próximo tema (um "press" instantâneo só move o foco).
    await page.keyboard.press("ArrowRight", { delay: 60 });
    const marcado = page.getByRole("radiogroup", { name: "Tema" }).getByRole("radio", {
      checked: true,
    });
    await expect(marcado).not.toHaveAttribute("data-testid", "tema-auto");
    await expect(page.getByRole("status").filter({ hasText: "Salvo" })).toBeVisible();
  });
});

test.describe("segurança", () => {
  test("respostas trazem os cabeçalhos de proteção", async ({ request }) => {
    const r = await request.get("/login");
    const h = r.headers();
    expect(h["x-frame-options"]).toBe("DENY");
    expect(h["content-security-policy"]).toContain("frame-ancestors 'none'");
    expect(h["content-security-policy"]).toContain("form-action 'self'");
    expect(h["x-content-type-options"]).toBe("nosniff");
    expect(h["referrer-policy"]).toBe("strict-origin-when-cross-origin");
    expect(h["permissions-policy"]).toContain("camera=()");
  });
});
