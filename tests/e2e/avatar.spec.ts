import { expect, test, type Page } from "@playwright/test";
import {
  cenarioPadrao,
  instalarSupabaseFalso,
  USUARIO,
  type EstadoFalso,
} from "./apoio-supabase-falso";

/**
 * Avatar RPG na Sala: sentado na mesa (aceno → lendo/escrevendo), editor (aparência, itens,
 * conjuntos, salvar e descartar), itens de conquista trancados e a liberação com aviso.
 * "Agora" = 7 de outubro de 2026, 15:00 em São Paulo.
 */
const AGORA = new Date("2026-10-07T18:00:00Z");

async function abrir(page: Page, estado: EstadoFalso = cenarioPadrao()) {
  await page.clock.install({ time: AGORA });
  await instalarSupabaseFalso(page, estado, "2026-10-07");
  await page.goto("/dev/sala");
  await expect(page.getByRole("heading", { name: "Sala", level: 1 })).toBeVisible();
  return estado;
}

const avatarNaSala = (page: Page) => page.getByTestId("avatar-na-sala");
const editor = (page: Page) => page.getByRole("dialog", { name: "Seu avatar" });
const postsDoAvatar = (estado: EstadoFalso) =>
  estado.requisicoes.filter(
    (r) =>
      r.tabela === "pixel_profiles" &&
      r.metodo === "POST" &&
      r.corpo &&
      "avatar" in (r.corpo as object),
  );

function comAvatar(avatar: Record<string, unknown>, estado = cenarioPadrao()): EstadoFalso {
  estado.pixel = {
    user_id: USUARIO,
    pet_species: null,
    pet_variant: null,
    pet_name: null,
    pet_accessory: null,
    avatar,
  };
  return estado;
}

test.describe("avatar na Sala", () => {
  test("aparece sentado na mesa: acena ao abrir e depois fica lendo", async ({ page }) => {
    await abrir(page);
    await expect(avatarNaSala(page)).toHaveAttribute("data-pose", "acenandoSentado");
    await page.clock.runFor(2000);
    await expect(avatarNaSala(page)).toHaveAttribute("data-pose", "lendo");
    await page.screenshot({ path: "test-results/avatar-na-sala.png" });
  });

  test("com Pomodoro de foco rodando, o avatar escreve (estuda junto)", async ({ page }) => {
    await page.addInitScript((agora) => {
      window.localStorage.setItem(
        "athenas-foco",
        JSON.stringify({
          fase: "foco",
          ciclo: 0,
          duracaoMs: 1500000,
          taskId: null,
          retomadoEm: agora - 60000,
          acumuladoMs: 0,
        }),
      );
    }, AGORA.getTime());
    await abrir(page);
    await page.clock.runFor(2000);
    await expect(avatarNaSala(page)).toHaveAttribute("data-pose", "sentado");
  });
});

test.describe("editor", () => {
  test("muda aparência e itens e salva (só a coluna avatar)", async ({ page }) => {
    const estado = await abrir(page);
    await avatarNaSala(page).click();
    const folha = editor(page);
    await expect(folha.getByRole("img", { name: /Prévia do seu avatar/ })).toBeVisible();

    await folha.getByRole("radio", { name: "Pele 4" }).click();
    await folha.getByRole("radio", { name: "Coque" }).click();
    await folha.getByRole("radio", { name: "Rosa" }).click();
    await folha.getByRole("tab", { name: "Itens" }).click();
    await folha.getByRole("radio", { name: "Boné" }).click();
    await folha.getByRole("radio", { name: "Moletom com capuz" }).click();
    await expect(
      folha.getByRole("img", { name: /Boné.*Moletom com capuz|Moletom com capuz.*Boné/ }),
    ).toBeVisible();
    await folha.getByRole("button", { name: "Salvar" }).click();

    await expect(folha).toHaveCount(0);
    await expect.poll(() => postsDoAvatar(estado).length).toBe(1);
    const corpo = postsDoAvatar(estado)[0]!.corpo as Record<string, unknown>;
    expect(Object.keys(corpo).sort()).toEqual(["avatar", "user_id"]); // não mexe no pet
    expect(corpo.avatar).toMatchObject({
      pele: "p4",
      cabelo: "coque",
      corDoCabelo: "rosa",
      equipados: { cabeca: "bone", blusa: "moletom" },
    });
  });

  test("fechar sem salvar descarta as mudanças", async ({ page }) => {
    const estado = await abrir(page);
    await page.getByRole("button", { name: "Editar avatar" }).click();
    await editor(page).getByRole("radio", { name: "Pele 1" }).click();
    await page.keyboard.press("Escape");
    await expect(editor(page)).toHaveCount(0);
    expect(postsDoAvatar(estado)).toHaveLength(0);
    await page.getByRole("button", { name: "Editar avatar" }).click();
    await expect(editor(page).getByRole("radio", { name: "Pele 2" })).toBeChecked();
  });

  test("o avatar salvo volta marcado no editor; id estranho vira o padrão", async ({ page }) => {
    await abrir(
      page,
      comAvatar({
        v: 1,
        pele: "p3",
        cabelo: "dreads",
        equipados: { cabeca: "bone", rosto: "coroa" },
      }),
    );
    await page.getByRole("button", { name: "Editar avatar" }).click();
    await expect(editor(page).getByRole("radio", { name: "Pele 3" })).toBeChecked();
    await expect(editor(page).getByRole("radio", { name: "Curtinho" })).toBeChecked();
    await editor(page).getByRole("tab", { name: "Itens" }).click();
    await expect(editor(page).getByRole("radio", { name: "Boné" })).toBeChecked();
  });
});

test.describe("conquistas", () => {
  test("item especial começa trancado, com o que falta; o conjunto pula o trancado", async ({
    page,
  }) => {
    const estado = await abrir(page);
    await page.getByRole("button", { name: "Editar avatar" }).click();
    const folha = editor(page);
    await folha.getByRole("tab", { name: "Itens" }).click();
    const chapeu = folha.getByRole("radio", { name: /Chapéu de mago/ });
    await expect(chapeu).toBeDisabled();
    await expect(chapeu).toContainText("10 horas de foco");
    await expect(chapeu).toContainText("faltam");

    await folha.getByRole("tab", { name: "Conjuntos" }).click();
    await folha.getByRole("button", { name: /Mago estudioso/ }).click();
    await folha.getByRole("button", { name: "Salvar" }).click();
    await expect.poll(() => postsDoAvatar(estado).length).toBe(1);
    const avatar = (
      postsDoAvatar(estado)[0]!.corpo as { avatar: { equipados: Record<string, string> } }
    ).avatar;
    expect(avatar.equipados).toEqual({ blusa: "tunica", pes: "botas" }); // mago, capa e varinha trancados
  });

  test("bater a meta libera o item, avisa e grava para sempre", async ({ page }) => {
    const estado = cenarioPadrao();
    estado.diasDeFoco = [
      { dia: "2026-10-06", minutos: 400, sessoes: 10 },
      { dia: "2026-10-07", minutos: 210, sessoes: 6 },
    ];
    await abrir(page, estado);
    await expect(page.getByText("Novo item para o avatar: Chapéu de mago!")).toBeVisible();
    await expect.poll(() => postsDoAvatar(estado).length).toBe(1);
    expect(
      (postsDoAvatar(estado)[0]!.corpo as { avatar: { desbloqueados: string[] } }).avatar
        .desbloqueados,
    ).toEqual(["mago"]);

    await page.getByRole("button", { name: "Editar avatar" }).click();
    await editor(page).getByRole("tab", { name: "Itens" }).click();
    await expect(editor(page).getByRole("radio", { name: "Chapéu de mago" })).toBeEnabled();
  });
});
