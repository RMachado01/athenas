import { describe, expect, it } from "vitest";
import {
  AVATAR_PADRAO,
  CONJUNTOS,
  CONQUISTAS,
  aplicarConjunto,
  itemLiberado,
  lerAvatar,
  novasConquistas,
  paraEscolhas,
  progressoDaConquista,
  type EstatisticasDeEstudo,
} from "@/features/pixel/avatar/modelo";
import { ITENS } from "@/features/pixel/avatar/itens";

const ZERO: EstatisticasDeEstudo = {
  minutosDeFoco: 0,
  melhorSequencia: 0,
  tarefasConcluidas: 0,
  cartoesRevisados: 0,
};

describe("lerAvatar", () => {
  it("sem nada salvo (ou lixo) = avatar padrão", () => {
    for (const bruto of [undefined, null, {}, "texto", 42, []]) {
      expect(lerAvatar(bruto)).toEqual(AVATAR_PADRAO);
    }
  });

  it("guarda o que é válido e troca pelo padrão o que não reconhece", () => {
    const a = lerAvatar({
      v: 1,
      pele: "p4",
      olhos: "verde",
      cabelo: "inexistente",
      corDoCabelo: "rosa",
      equipados: { cabeca: "bone", rosto: "coroa", blusa: "jaleco", pes: "mago" },
      desbloqueados: [],
    });
    expect(a).toMatchObject({
      pele: "p4",
      olhos: "verde",
      cabelo: AVATAR_PADRAO.cabelo,
      corDoCabelo: "rosa",
    });
    // "coroa" não existe; "mago" é de cabeça, não de pés.
    expect(a.equipados).toEqual({ cabeca: "bone", blusa: "jaleco" });
  });

  it("nunca deixa equipado um item de conquista que ainda está trancado", () => {
    expect(lerAvatar({ equipados: { cabeca: "mago" } }).equipados).toEqual({});
    expect(lerAvatar({ equipados: { cabeca: "mago" }, desbloqueados: ["mago"] }).equipados).toEqual(
      {
        cabeca: "mago",
      },
    );
  });

  it("a lista de desbloqueados só aceita itens de conquista, sem repetir", () => {
    expect(lerAvatar({ desbloqueados: ["mago", "mago", "bone", "xyz", 3] }).desbloqueados).toEqual([
      "mago",
    ]);
  });

  it("paraEscolhas vira o formato que o desenho usa", () => {
    expect(paraEscolhas(AVATAR_PADRAO)).toEqual({
      pele: AVATAR_PADRAO.pele,
      olhos: AVATAR_PADRAO.olhos,
      cabelo: AVATAR_PADRAO.cabelo,
      corDoCabelo: AVATAR_PADRAO.corDoCabelo,
      equipados: {},
    });
  });
});

describe("conquistas (G1)", () => {
  it("são 4 itens especiais, que existem no catálogo", () => {
    expect(CONQUISTAS.map((c) => c.item).sort()).toEqual(["capa", "louros", "mago", "varinha"]);
    for (const c of CONQUISTAS) expect(ITENS.some((i) => i.id === c.item)).toBe(true);
  });

  it("item comum está sempre liberado; o de conquista só depois de ganho", () => {
    expect(itemLiberado(AVATAR_PADRAO, "bone")).toBe(true);
    expect(itemLiberado(AVATAR_PADRAO, "mago")).toBe(false);
    expect(itemLiberado({ ...AVATAR_PADRAO, desbloqueados: ["mago"] }, "mago")).toBe(true);
  });

  it("cada regra libera ao bater a meta (e só a partir dela)", () => {
    const casos: [Partial<EstatisticasDeEstudo>, string][] = [
      [{ minutosDeFoco: 600 }, "mago"],
      [{ melhorSequencia: 7 }, "louros"],
      [{ tarefasConcluidas: 30 }, "capa"],
      [{ cartoesRevisados: 100 }, "varinha"],
    ];
    for (const [est, item] of casos) {
      expect(novasConquistas(AVATAR_PADRAO, { ...ZERO, ...est })).toEqual([item]);
      const quase = Object.fromEntries(Object.entries(est).map(([k, v]) => [k, (v as number) - 1]));
      expect(novasConquistas(AVATAR_PADRAO, { ...ZERO, ...quase })).toEqual([]);
    }
  });

  it("o que já foi ganho não volta como novidade", () => {
    const est = { ...ZERO, minutosDeFoco: 9999 };
    expect(novasConquistas({ ...AVATAR_PADRAO, desbloqueados: ["mago"] }, est)).toEqual([]);
  });

  it("o texto diz quanto falta (em horas, dias, tarefas ou revisões)", () => {
    expect(progressoDaConquista("mago", { ...ZERO, minutosDeFoco: 420 })).toMatchObject({
      pronta: false,
      texto: "faltam 3 h de foco",
    });
    expect(progressoDaConquista("louros", { ...ZERO, melhorSequencia: 6 }).texto).toBe(
      "falta 1 dia de sequência",
    );
    expect(progressoDaConquista("capa", { ...ZERO, tarefasConcluidas: 25 }).texto).toBe(
      "faltam 5 tarefas concluídas",
    );
    expect(progressoDaConquista("varinha", { ...ZERO, cartoesRevisados: 99 }).texto).toBe(
      "falta 1 flashcard revisado",
    );
    expect(progressoDaConquista("mago", { ...ZERO, minutosDeFoco: 601 })).toMatchObject({
      pronta: true,
    });
  });
});

describe("conjuntos prontos", () => {
  it("são os 6 aprovados e só usam itens que existem na parte certa", () => {
    expect(CONJUNTOS.map((c) => c.nome)).toEqual([
      "Mago estudioso",
      "Cientista",
      "Aventureiro",
      "Cavaleiro dos livros",
      "Modo confortável",
      "Fada das provas",
    ]);
    for (const c of CONJUNTOS) {
      for (const [parte, id] of Object.entries(c.itens)) {
        expect(ITENS.find((i) => i.id === id)?.parte, `${c.nome}/${id}`).toBe(parte);
      }
    }
  });

  it("aplicar troca o equipamento todo, mas pula o que ainda está trancado", () => {
    const mago = CONJUNTOS.find((c) => c.nome === "Mago estudioso")!;
    const vestido = aplicarConjunto({ ...AVATAR_PADRAO, equipados: { rosto: "oculos" } }, mago);
    expect(vestido.equipados.cabeca).toBeUndefined(); // chapéu de mago ainda trancado
    expect(vestido.equipados.rosto).toBeUndefined(); // o conjunto não tem óculos
    expect(vestido.equipados.blusa).toBe("tunica");
    const liberado = aplicarConjunto(
      { ...AVATAR_PADRAO, desbloqueados: ["mago", "capa", "varinha"] },
      mago,
    );
    expect(liberado.equipados).toMatchObject({ cabeca: "mago", costas: "capa", mao: "varinha" });
    // A aparência (pele, cabelo…) não muda.
    expect(liberado.pele).toBe(AVATAR_PADRAO.pele);
  });
});
