import { expect, test, type Page } from "@playwright/test";
import {
  cenarioPadrao,
  instalarSupabaseFalso,
  USUARIO,
  type EstadoFalso,
} from "./apoio-supabase-falso";

/**
 * Sala, fatia B: recados (reações E2–E8), brincadeiras (petisco, bolinha), estudar junto
 * durante o Pomodoro, comemorar a meta, cochilo por inatividade e o pet na tela de Foco.
 * "Agora" = quarta, 7 de outubro de 2026, 15:00 em São Paulo (relógio falso do Playwright).
 * No cenário padrão há 2 tarefas para hoje e 1 atrasada.
 */
const AGORA = new Date("2026-10-07T18:00:00Z");

function comPet(estado: EstadoFalso = cenarioPadrao()): EstadoFalso {
  estado.pixel = {
    user_id: USUARIO,
    pet_species: "gato",
    pet_variant: "laranja",
    pet_name: "Mingau",
    pet_accessory: null,
    avatar: {},
  };
  return estado;
}

async function abrir(page: Page, estado: EstadoFalso, caminho = "/dev/sala") {
  await page.clock.install({ time: AGORA });
  await instalarSupabaseFalso(page, estado, "2026-10-07");
  await page.goto(caminho);
  return estado;
}

/** Planta valores no localStorage antes do app carregar. */
async function guardar(page: Page, valores: Record<string, string>) {
  await page.addInitScript((v) => {
    for (const [k, x] of Object.entries(v)) window.localStorage.setItem(k, x);
  }, valores);
}

/** Um Pomodoro de foco rodando há 1 minuto (o mesmo formato que o Foco grava). */
const focoRodando = () =>
  JSON.stringify({
    fase: "foco",
    ciclo: 0,
    duracaoMs: 25 * 60_000,
    taskId: null,
    retomadoEm: AGORA.getTime() - 60_000,
    acumuladoMs: 0,
  });

const pet = (page: Page) => page.getByRole("button", { name: "Fazer carinho em Mingau" });
const recados = (page: Page) => page.getByRole("region", { name: "Recados do Mingau" });

test.describe("recados", () => {
  test("tarefas do dia: balão de exclamação e recado com link para Tarefas", async ({ page }) => {
    await abrir(page, comPet());
    await expect(recados(page).getByText("2 tarefas para hoje e 1 atrasada")).toBeVisible();
    await expect(recados(page).getByRole("link", { name: "Ver tarefas" })).toHaveAttribute(
      "href",
      "/tarefas",
    );
    await expect(page.getByTestId("balao-do-pet")).toHaveAttribute("data-emote", "exclamacao");
  });

  test("nada acontecendo: sem recados e sem balão", async ({ page }) => {
    const estado = comPet();
    estado.tarefas = [];
    await abrir(page, estado);
    await expect(pet(page)).toBeVisible();
    await expect(recados(page)).toHaveCount(0);
    await expect(page.getByTestId("balao-do-pet")).toHaveCount(0);
  });

  test("sumiu por dias e tem nota nova: saudade e lâmpada", async ({ page }) => {
    const estado = comPet();
    estado.tarefas = [];
    estado.notas.notas.push({
      id: "00000000-0000-4000-8000-00000000aaaa",
      title: "Joins",
      icon: null,
      content: {},
      plain_text: "",
      track_id: null,
      archived_at: null,
      updated_at: "2026-10-05T12:00:00Z",
    });
    await guardar(page, { "athenas-sala-visita": "2026-10-03T18:00:00Z" });
    await abrir(page, estado);
    await expect(
      recados(page).getByText("Que saudade! faz 4 dias que você não aparece"),
    ).toBeVisible();
    await expect(recados(page).getByText("1 nota nova desde a última visita")).toBeVisible();
    await expect(recados(page).getByRole("link", { name: "Ver notas" })).toBeVisible();
  });

  test("dias sem estudar: começa dormindo e convida para o Foco", async ({ page }) => {
    const estado = comPet();
    estado.tarefas = [];
    estado.diasDeFoco = [{ dia: "2026-10-01", minutos: 30, sessoes: 1 }];
    await abrir(page, estado);
    await expect(pet(page)).toHaveAttribute("data-estado", "dormindo");
    await expect(
      recados(page).getByText("Faz 6 dias sem estudar: bora um pouquinho?"),
    ).toBeVisible();
    await expect(recados(page).getByRole("link", { name: "Abrir o Foco" })).toHaveAttribute(
      "href",
      "/foco",
    );
  });

  test("meta do dia batida: comemora ao abrir (só na 1ª vez do dia)", async ({ page }) => {
    const estado = comPet();
    estado.tarefas = [];
    estado.diasDeFoco = [{ dia: "2026-10-07", minutos: 130, sessoes: 5 }];
    await abrir(page, estado);
    await expect(recados(page).getByText("Meta de hoje batida!")).toBeVisible();
    await expect(pet(page)).toHaveAttribute("data-estado", "pulando");
    await expect(pet(page)).toHaveAttribute("data-estado", "feliz");

    await page.reload();
    await expect(pet(page)).toBeVisible();
    await page.clock.runFor(1500);
    await expect(pet(page)).not.toHaveAttribute("data-estado", "pulando");
  });
});

test.describe("estudar junto", () => {
  test("com Pomodoro rodando, o pet deita ao lado do livro e não passeia", async ({ page }) => {
    await guardar(page, { "athenas-foco": focoRodando() });
    await abrir(page, comPet());
    await expect(pet(page)).toHaveAttribute("data-estado", "descansando");
    await expect(page.getByTestId("livro-da-sala")).toBeVisible();
    await expect(recados(page).getByText("Estudando junto com você")).toBeVisible();
    await page.clock.runFor(10_000);
    await expect(pet(page)).toHaveAttribute("data-estado", "descansando");
  });

  test("na tela de Foco: o pet estuda junto e comemora quando o foco termina", async ({ page }) => {
    await abrir(page, comPet(), "/dev/foco");
    const companheiro = page.getByTestId("pet-companheiro");
    await expect(companheiro).toHaveAttribute("data-estado", "parado");
    await page.getByRole("button", { name: "Iniciar foco" }).click();
    await expect(companheiro).toHaveAttribute("data-estado", "descansando");
    await expect(companheiro).toHaveAccessibleName(/Mingau está estudando junto com você/);
    await page.getByRole("button", { name: "Concluir agora" }).click();
    await expect(companheiro).toHaveAttribute("data-estado", "pulando");
    await expect(companheiro).toHaveAccessibleName(/comemorando/);
  });

  test("sem pet, a tela de Foco não mostra companheiro", async ({ page }) => {
    await abrir(page, cenarioPadrao(), "/dev/foco");
    await expect(page.getByRole("heading", { name: "Foco", level: 1 })).toBeVisible();
    await expect(page.getByTestId("pet-companheiro")).toHaveCount(0);
  });
});

test.describe("brincadeiras", () => {
  test("petisco: a tigela aparece, ele vai até ela, come e fica feliz", async ({ page }) => {
    const estado = comPet();
    estado.tarefas = [];
    await abrir(page, estado);
    await page.getByRole("button", { name: "Dar petisco" }).click();
    await expect(page.getByTestId("objeto-tigela")).toBeVisible();
    await expect(pet(page)).toHaveAttribute("data-estado", "andando");
    // O relógio corre normalmente: cada etapa dura alguns segundos (caminhada ≤ 3 s, comer 1,8 s).
    await expect(pet(page)).toHaveAttribute("data-estado", "comendo", { timeout: 8000 });
    await expect(pet(page)).toHaveAttribute("data-estado", "feliz", { timeout: 5000 });
    await expect(page.getByTestId("objeto-tigela")).toHaveCount(0, { timeout: 5000 });
  });

  test("bolinha: ela rola, ele corre atrás e pula", async ({ page }) => {
    const estado = comPet();
    estado.tarefas = [];
    await abrir(page, estado);
    await page.getByRole("button", { name: "Jogar bolinha" }).click();
    await expect(page.getByTestId("objeto-bolinha")).toBeVisible();
    await expect(pet(page)).toHaveAttribute("data-estado", "correndo");
    await expect(pet(page)).toHaveAttribute("data-estado", /pulando|feliz/, { timeout: 6000 });
  });

  test("com reduzir movimento, o petisco acontece no lugar (sem caminhada)", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    const estado = comPet();
    estado.tarefas = [];
    await abrir(page, estado);
    await page.getByRole("button", { name: "Dar petisco" }).click();
    await expect(pet(page)).toHaveAttribute("data-estado", "comendo");
  });
});

test.describe("cochilo quando você para", () => {
  test("sem mexer por 45 s ele dorme; ao voltar, se espreguiça", async ({ page }) => {
    const estado = comPet();
    estado.tarefas = [];
    await abrir(page, estado);
    await expect(pet(page)).toBeVisible();
    await page.clock.runFor(46_000);
    await expect(pet(page)).toHaveAttribute("data-estado", "dormindo");
    await page.getByRole("heading", { name: "Sala", level: 1 }).click();
    await expect(pet(page)).toHaveAttribute("data-estado", "espreguicando");
  });
});
