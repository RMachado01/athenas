import { expect, test, type Page } from "@playwright/test";
import { cenarioPadrao, prepararTela } from "./apoio-supabase-falso";

/**
 * Hidratação: a 1ª renderização do navegador precisa ser IGUAL ao HTML que o servidor mandou.
 *
 * Duas coisas faziam as telas divergirem:
 *  1. Relógio: o servidor calcula o "hoje" com a hora DELE; o navegador, com a do aparelho (aqui,
 *     o relógio falso do teste, uma semana antes). Na vida real isso acontece perto da meia-noite.
 *  2. Cache: o provedor (fora do <Suspense> da página) já busca o perfil ao hidratar. Quando o
 *     React chega a hidratar a página, o perfil já está no cache e o cliente desenha "Conta de
 *     Fulano" onde o servidor desenhou "carregando".
 *
 * Quando diverge, o React joga fora o HTML do servidor e refaz tudo no cliente (e acusa erro).
 * Este teste falha se aparecer qualquer erro de hidratação no navegador.
 */
function vigiarHidratacao(page: Page) {
  const erros: string[] = [];
  const ehDeHidratacao = (texto: string) => /hydrat/i.test(texto);
  page.on("pageerror", (erro) => {
    if (ehDeHidratacao(erro.message)) erros.push(erro.message.split("\n")[0]!);
  });
  page.on("console", (msg) => {
    if (msg.type() === "error" && ehDeHidratacao(msg.text())) {
      erros.push(msg.text().split("\n")[0]!);
    }
  });
  return erros;
}

const TELAS: { caminho: string; pronta: (page: Page) => Promise<void> }[] = [
  {
    caminho: "/dev/inicio",
    // "Conta de Teste" só aparece depois que o perfil chega: a tela está no estado final.
    pronta: (page) => expect(page.getByRole("button", { name: "Conta de Teste" })).toBeVisible(),
  },
  {
    caminho: "/dev/foco",
    pronta: async (page) => {
      await expect(page.getByRole("timer")).toHaveText("25:00");
      await expect(page.getByRole("region", { name: "Resumo do dia" })).toBeVisible();
    },
  },
  {
    caminho: "/dev/personalizacao",
    pronta: (page) => expect(page.getByLabel(/^Meta diária/)).toBeVisible(),
  },
  {
    caminho: "/dev/tarefas",
    pronta: (page) =>
      expect(page.getByRole("heading", { name: "Tarefas", level: 1 })).toBeVisible(),
  },
];

for (const { caminho, pronta } of TELAS) {
  test(`${caminho} hidrata sem divergir do servidor`, async ({ page }) => {
    const erros = vigiarHidratacao(page);
    await prepararTela(page, cenarioPadrao());
    await page.goto(caminho);
    await pronta(page);
    expect(erros).toEqual([]);
  });
}
