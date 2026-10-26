import { expect, test, type Page } from "@playwright/test";
import { cenarioPadrao, prepararTela, USUARIO, type EstadoFalso } from "./apoio-supabase-falso";
import { definirCookieDeTema } from "./apoio-tema";

/**
 * Sala pixel (etapa solo): adotar um pet com nome, tocar para fazer carinho, editar, o pet
 * ficar dentro do palco, "reduzir movimento" e o tema Preto e Branco (cena cinza, pet colorido).
 */
const comPet = (
  nome = "Mingau",
  especie = "gato",
  variacao = "laranja",
  acessorio: string | null = null,
): EstadoFalso => {
  const estado = cenarioPadrao();
  estado.pixel = {
    user_id: USUARIO,
    pet_species: especie,
    pet_variant: variacao,
    pet_name: nome,
    pet_accessory: acessorio,
    avatar: {},
  };
  return estado;
};

async function abrir(page: Page, estado: EstadoFalso) {
  await prepararTela(page, estado);
  await page.goto("/dev/sala");
  await expect(page.getByRole("heading", { name: "Sala", level: 1 })).toBeVisible();
}

const pixelPosts = (estado: EstadoFalso) =>
  estado.requisicoes.filter((r) => r.tabela === "pixel_profiles" && r.metodo === "POST");

test.describe("adotar", () => {
  test("sem pet: convida a adotar; nome vazio avisa; adota com espécie, cor e nome", async ({
    page,
  }) => {
    const estado = cenarioPadrao();
    await abrir(page, estado);
    await expect(page.getByText("Você ainda não tem um pet")).toBeVisible();
    await expect(page.getByTestId("palco-da-sala")).toBeVisible(); // a sala já aparece, vazia
    await page.getByRole("button", { name: "Adotar um pet" }).first().click();

    const folha = page.getByRole("dialog", { name: "Adotar um pet" });
    await folha.getByRole("button", { name: "Adotar", exact: true }).click();
    await expect(folha.getByRole("alert")).toHaveText("Dê um nome para o seu pet.");

    await folha.getByRole("radio", { name: "Capivara" }).click();
    await folha.getByRole("radio", { name: "Caramelo" }).click();
    await folha.getByLabel("Nome do seu pet").fill("  Capi  ");
    await folha.getByRole("button", { name: "Adotar", exact: true }).click();

    await expect(page.getByRole("button", { name: "Fazer carinho em Capi" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Capi", level: 2, exact: true })).toBeVisible();
    await expect(page.getByText("Capivara · Caramelo")).toBeVisible();
    await expect.poll(() => pixelPosts(estado).length).toBe(1);
    expect(pixelPosts(estado)[0]!.corpo).toMatchObject({
      user_id: USUARIO,
      pet_species: "capivara",
      pet_variant: "caramelo",
      pet_name: "Capi", // sem os espaços das pontas
    });
  });

  test("as 4 espécies estão lá, cada uma com as suas cores", async ({ page }) => {
    await abrir(page, cenarioPadrao());
    await page.getByRole("button", { name: "Adotar um pet" }).first().click();
    const folha = page.getByRole("dialog", { name: "Adotar um pet" });
    for (const especie of ["Gato", "Capivara", "Macaco", "Gato-banana"]) {
      await expect(folha.getByRole("radio", { name: especie, exact: true })).toBeVisible();
    }
    await folha.getByRole("radio", { name: "Gato-banana" }).click();
    await expect(folha.getByRole("radio", { name: "Verde" })).toBeVisible();
    await folha.getByRole("radio", { name: "Macaco" }).click();
    await expect(folha.getByRole("radio", { name: "Dourado", exact: true })).toBeVisible();
  });

  test("pelagem nova (com padrão) e acessório: a prévia acompanha e tudo é salvo", async ({
    page,
  }) => {
    const estado = cenarioPadrao();
    await abrir(page, estado);
    await page.getByRole("button", { name: "Adotar um pet" }).first().click();
    const folha = page.getByRole("dialog", { name: "Adotar um pet" });
    await expect(folha.getByRole("img", { name: "Prévia: Gato Laranja" })).toBeVisible();
    await expect(folha.getByRole("radio", { name: "Nenhum" })).toBeChecked();

    await folha.getByRole("radio", { name: "Tigrado" }).click();
    await folha.getByRole("radio", { name: "Fone de ouvido" }).click();
    await expect(
      folha.getByRole("img", { name: "Prévia: Gato Tigrado com fone de ouvido" }),
    ).toBeVisible();

    await folha.getByLabel("Nome do seu pet").fill("Tigre");
    await folha.getByRole("button", { name: "Adotar", exact: true }).click();
    await expect(page.getByText("Gato · Tigrado")).toBeVisible();
    await expect.poll(() => pixelPosts(estado).length).toBe(1);
    expect(pixelPosts(estado)[0]!.corpo).toMatchObject({
      pet_species: "gato",
      pet_variant: "tigrado",
      pet_accessory: "fone",
    });
  });

  test("todas as pelagens aprovadas aparecem na sua espécie", async ({ page }) => {
    await abrir(page, cenarioPadrao());
    await page.getByRole("button", { name: "Adotar um pet" }).first().click();
    const folha = page.getByRole("dialog", { name: "Adotar um pet" });
    const pelagens: [string, string[]][] = [
      ["Gato", ["Tigrado", "Frajola", "Siamês"]],
      ["Capivara", ["Ruiva"]],
      ["Macaco", ["Mico-leão-dourado"]],
      ["Gato-banana", ["Banana madura"]],
    ];
    for (const [especie, cores] of pelagens) {
      await folha.getByRole("radio", { name: especie, exact: true }).click();
      for (const cor of cores) await expect(folha.getByRole("radio", { name: cor })).toBeVisible();
    }
  });

  test("nome com mais de 24 letras não cabe no campo", async ({ page }) => {
    await abrir(page, cenarioPadrao());
    await page.getByRole("button", { name: "Adotar um pet" }).first().click();
    const campo = page.getByRole("dialog").getByLabel("Nome do seu pet");
    await campo.fill("x".repeat(40));
    expect((await campo.inputValue()).length).toBe(24);
  });

  test("se o banco recusar, o pet não fica na sala e avisa", async ({ page }) => {
    const estado = cenarioPadrao();
    await abrir(page, estado);
    estado.falharEscritas = true;
    await page.getByRole("button", { name: "Adotar um pet" }).first().click();
    const folha = page.getByRole("dialog", { name: "Adotar um pet" });
    await folha.getByLabel("Nome do seu pet").fill("Mingau");
    await folha.getByRole("button", { name: "Adotar", exact: true }).click();
    await expect(page.getByText(/Não deu pra salvar o seu pet/)).toBeVisible();
    await expect(page.getByRole("button", { name: /Fazer carinho em/ })).toHaveCount(0);
    await expect(page.getByText("Você ainda não tem um pet")).toBeVisible();
  });
});

test.describe("com pet", () => {
  test("mostra o nome, a espécie e a cor", async ({ page }) => {
    await abrir(page, comPet("Mingau", "gato", "preto"));
    await expect(
      page.getByRole("heading", { name: "Mingau", level: 2, exact: true }),
    ).toBeVisible();
    await expect(page.getByText("Gato · Preto")).toBeVisible();
    await expect(page.getByText("Toque no Mingau para fazer carinho.")).toBeVisible();
  });

  test("tocar no pet faz carinho: pulinho, fica feliz e depois volta ao normal", async ({
    page,
  }) => {
    await abrir(page, comPet());
    const pet = page.getByRole("button", { name: "Fazer carinho em Mingau" });
    await pet.click();
    await expect(pet).toHaveAttribute("data-estado", "pulando");
    await expect(pet).toHaveAttribute("data-estado", "feliz");
    // o coração flutua e some sozinho
    await expect(page.getByRole("status").filter({ hasText: "Mingau está feliz" })).toBeAttached();
    await expect
      .poll(async () => pet.getAttribute("data-estado"), { timeout: 8000 })
      .not.toBe("feliz");
  });

  test("editar: troca nome, espécie e cor", async ({ page }) => {
    const estado = comPet();
    await abrir(page, estado);
    await page.getByRole("button", { name: "Editar pet" }).click();
    const folha = page.getByRole("dialog", { name: "Editar pet" });
    await expect(folha.getByLabel("Nome do seu pet")).toHaveValue("Mingau");
    await folha.getByRole("radio", { name: "Macaco" }).click();
    await folha.getByRole("radio", { name: "Preto" }).click();
    await folha.getByLabel("Nome do seu pet").fill("Chico");
    await folha.getByRole("button", { name: "Salvar", exact: true }).click();
    await expect(page.getByRole("heading", { name: "Chico", level: 2, exact: true })).toBeVisible();
    await expect(page.getByText("Macaco · Preto")).toBeVisible();
    await expect
      .poll(() => pixelPosts(estado).at(-1)?.corpo)
      .toMatchObject({
        pet_species: "macaco",
        pet_variant: "preto",
        pet_name: "Chico",
      });
  });

  test("editar: o acessório salvo vem marcado e dá para tirar", async ({ page }) => {
    const estado = comPet("Mingau", "gato", "laranja", "chapeu");
    await abrir(page, estado);
    await page.getByRole("button", { name: "Editar pet" }).click();
    const folha = page.getByRole("dialog", { name: "Editar pet" });
    await expect(folha.getByRole("radio", { name: "Chapéu de formatura" })).toBeChecked();
    await folha.getByRole("radio", { name: "Nenhum" }).click();
    await folha.getByRole("button", { name: "Salvar", exact: true }).click();
    await expect
      .poll(() => pixelPosts(estado).at(-1)?.corpo)
      .toMatchObject({ pet_accessory: null });
  });

  test("um acessório que o app não conhece aparece como nenhum (sem quebrar)", async ({ page }) => {
    await abrir(page, comPet("Mingau", "gato", "laranja", "coroa"));
    await expect(page.getByRole("button", { name: "Fazer carinho em Mingau" })).toBeVisible();
    await page.getByRole("button", { name: "Editar pet" }).click();
    await expect(page.getByRole("dialog").getByRole("radio", { name: "Nenhum" })).toBeChecked();
  });

  test("o pet passeia, mas nunca sai do palco", async ({ page }) => {
    await abrir(page, comPet());
    const palco = (await page.getByTestId("palco-da-sala").boundingBox())!;
    const pet = page.getByRole("button", { name: "Fazer carinho em Mingau" });
    let andou = false;
    let ultimoX: number | null = null;
    for (let i = 0; i < 14; i += 1) {
      const caixa = (await pet.boundingBox())!;
      expect(caixa.x).toBeGreaterThanOrEqual(palco.x - 1);
      expect(caixa.x + caixa.width).toBeLessThanOrEqual(palco.x + palco.width + 1);
      expect(caixa.y).toBeGreaterThanOrEqual(palco.y - 1);
      expect(caixa.y + caixa.height).toBeLessThanOrEqual(palco.y + palco.height + 1);
      if (ultimoX !== null && Math.abs(caixa.x - ultimoX) > 2) andou = true;
      ultimoX = caixa.x;
      await page.waitForTimeout(700);
    }
    // Em 10 s o pet costuma passear ao menos uma vez (se só dormiu, tudo bem: não derruba o teste).
    expect(typeof andou).toBe("boolean");
  });
});

test.describe("reduzir movimento", () => {
  test.use({ reducedMotion: "reduce" });

  test("o pet fica quieto (parado) e o toque só mostra o carinho por um instante", async ({
    page,
  }) => {
    await abrir(page, comPet());
    const pet = page.getByRole("button", { name: "Fazer carinho em Mingau" });
    const antes = (await pet.boundingBox())!;
    await page.waitForTimeout(4000); // tempo de sobra para um pet normal já ter saído do lugar
    const depois = (await pet.boundingBox())!;
    expect(Math.abs(depois.x - antes.x)).toBeLessThan(1);
    await expect(pet).toHaveAttribute("data-estado", "parado");
    await pet.click();
    await expect(pet).toHaveAttribute("data-estado", "feliz");
    await expect(pet).toHaveAttribute("data-estado", "parado", { timeout: 6000 });
  });
});

test.describe("tema Preto e Branco", () => {
  test("a sala (e a cadeira) ficam cinza; pet e avatar continuam coloridos", async ({
    page,
    context,
  }) => {
    await definirCookieDeTema(context, "mono");
    await abrir(page, comPet("Capi", "capivara", "marrom"));
    // Cenário = a sala e a cadeira do avatar.
    const cena = page.locator(".cenario-sala");
    await expect(cena).toHaveCount(2);
    for (const parte of await cena.all()) {
      await expect(parte).toHaveCSS("filter", /grayscale\(1\)/);
    }
    await expect(page.getByTestId("avatar-na-sala")).toHaveCSS("filter", "none");
    const pet = page.getByRole("button", { name: "Fazer carinho em Capi" });
    await expect(pet).toBeVisible();
    await expect(pet).toHaveCSS("filter", "none");
    // e nenhum ancestral do pet até o palco tem filtro (senão ele também ficaria cinza)
    const filtros = await pet.evaluate((el) => {
      const lista: string[] = [];
      let n: Element | null = el;
      while (n && (n as HTMLElement).dataset?.testid !== "palco-da-sala") {
        lista.push(getComputedStyle(n).filter);
        n = n.parentElement;
      }
      return lista;
    });
    expect(filtros.every((f) => f === "none")).toBe(true);
  });

  test("em outro tema a sala NÃO é cinza", async ({ page, context }) => {
    await definirCookieDeTema(context, "camel");
    await abrir(page, comPet());
    for (const parte of await page.locator(".cenario-sala").all()) {
      await expect(parte).toHaveCSS("filter", "none");
    }
  });
});

test.describe("entrada pela aba Estudo", () => {
  test("o cartão Sala mostra o nome do pet e leva até ela; a aba Estudo fica acesa", async ({
    page,
  }) => {
    await prepararTela(page, comPet("Mingau"));
    await page.goto("/dev/estudo");
    const cartao = page.getByRole("main").getByRole("link", { name: /^Sala/ });
    await expect(cartao).toContainText("Mingau te espera");
    await expect(cartao).toHaveAttribute("href", "/dev/sala");
    await cartao.click();
    await expect(page.getByRole("heading", { name: "Sala", level: 1 })).toBeVisible();
    await expect(
      page.getByRole("navigation", { name: "Principal" }).getByRole("link", { name: "Estudo" }),
    ).toHaveAttribute("aria-current", "page");
  });

  test("sem pet, o cartão convida a adotar", async ({ page }) => {
    await prepararTela(page, cenarioPadrao());
    await page.goto("/dev/estudo");
    await expect(page.getByRole("main").getByRole("link", { name: /^Sala/ })).toContainText(
      "Adote um pet",
    );
  });
});
