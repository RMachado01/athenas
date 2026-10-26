import { describe, expect, it } from "vitest";
import {
  PADRAO,
  paletaDoAvatar,
  quadrosDoAvatar,
  tamanhoDoAvatar,
  type EscolhasDoAvatar,
} from "@/features/pixel/avatar/montar";
import {
  CABECA,
  CABECA_PISCANDO,
  OLHOS,
  OLHOS_CORES,
  PELES,
  POSES,
} from "@/features/pixel/avatar/corpo";
import { CABELOS, CORES_DE_CABELO, ITENS, type Parte } from "@/features/pixel/avatar/itens";
import { validarGrade } from "@/features/pixel/motor";

/** Avatar RPG (conceito): peças retangulares, rosto livre, tamanho único e tudo com cor. */
const BASE: EscolhasDoAvatar = {
  pele: "p2",
  olhos: "castanho",
  cabelo: "curto",
  corDoCabelo: "preto",
  equipados: {},
};
const LETRAS_DA_PARTE: Record<Parte, RegExp> = {
  cabeca: /^[A-F]$/,
  rosto: /^[G-I]$/,
  blusa: /^[J-Lcfd]$/,
  pernas: /^[MNtnp]$/,
  pes: /^[Oqgr]$/,
  costas: /^[P-T]$/,
  mao: /^[U-Z]$/,
};

describe("avatar RPG: peças", () => {
  it("toda grade é retangular", () => {
    const todas = new Set([..."abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ"]);
    const grades: [string, readonly string[]][] = [
      ["cabeça", CABECA],
      ["cabeça piscando", CABECA_PISCANDO],
      ...CABELOS.flatMap((c) => [
        [`${c.id}`, c.frente] as [string, readonly string[]],
        ...(c.tras ? [[`${c.id}/trás`, c.tras] as [string, readonly string[]]] : []),
      ]),
      ...ITENS.flatMap((i) => [
        ...(i.grade ? [[i.id, i.grade] as [string, readonly string[]]] : []),
        ...(i.detalheDoTorso
          ? [[`${i.id}/detalhe`, i.detalheDoTorso] as [string, readonly string[]]]
          : []),
      ]),
      ...POSES.flatMap((p) =>
        p.quadros.flatMap(
          (q, k) =>
            [
              [`${p.id}${k}/torso`, q.torso],
              [`${p.id}${k}/pernas`, q.pernas],
              [`${p.id}${k}/braço`, q.braco],
            ] as [string, readonly string[]][],
        ),
      ),
    ];
    for (const [nome, g] of grades) expect(validarGrade(g, todas), nome).toEqual([]);
  });

  it("cada item só usa as letras da sua parte (nunca colide com outra parte)", () => {
    for (const item of ITENS) {
      for (const letra of Object.keys(item.cores)) {
        expect(letra, `${item.id} usa "${letra}"`).toMatch(LETRAS_DA_PARTE[item.parte]);
      }
    }
  });

  it("nenhum cabelo, chapéu ou o rosto padrão cobre os olhos (óculos escuros é a exceção de propósito)", () => {
    for (const cabelo of CABELOS) {
      for (const item of [undefined, ...ITENS.filter((i) => i.parte === "cabeca")]) {
        const e = { ...BASE, cabelo: cabelo.id, equipados: item ? { cabeca: item.id } : {} };
        const [q] = quadrosDoAvatar("parado", e);
        const parado = quadrosDoAvatar("parado", { ...BASE, equipados: {} })[0]!;
        // A íris (x) aparece no mesmo lugar que no avatar sem nada na cabeça.
        const iris = (g: string[]) =>
          g.flatMap((l, y) => [...l].map((c, x) => (c === "x" ? `${x},${y}` : ""))).filter(Boolean);
        expect(iris(q!), `${cabelo.id}/${item?.id ?? "-"}`).toEqual(iris(parado));
      }
    }
    expect(OLHOS).toHaveLength(4);
  });

  it("todas as poses e combinações têm o mesmo tamanho", () => {
    const { largura, altura } = tamanhoDoAvatar();
    for (const pose of POSES) {
      for (const item of [undefined, ...ITENS]) {
        for (const q of quadrosDoAvatar(pose.id, {
          ...BASE,
          equipados: item ? { [item.parte]: item.id } : {},
        })) {
          expect([q[0]!.length, q.length], `${pose.id}/${item?.id}`).toEqual([largura, altura]);
        }
      }
    }
  });

  it("toda combinação tem cor para cada letra desenhada", () => {
    // Dois eixos independentes (as letras do corpo não dependem dos itens e vice-versa):
    // todo item em toda pose numa aparência, e toda aparência (pele x olhos x cor) sem itens.
    const conferir = (e: EscolhasDoAvatar, rotulo: string) => {
      const paleta = paletaDoAvatar(e);
      for (const pose of POSES) {
        for (const q of quadrosDoAvatar(pose.id, e)) {
          for (const letra of new Set(q.join("").replaceAll(".", ""))) {
            expect(paleta[letra], `${rotulo}/${pose.id} sem cor para "${letra}"`).toMatch(
              /^#[0-9a-f]{6}$/i,
            );
          }
        }
      }
    };
    for (const item of ITENS)
      conferir({ ...BASE, cabelo: "longo", equipados: { [item.parte]: item.id } }, item.id);
    for (const pele of PELES) {
      for (const olhos of OLHOS_CORES) {
        for (const cor of CORES_DE_CABELO) {
          conferir(
            { ...BASE, pele: pele.id, olhos: olhos.id, corDoCabelo: cor.id, cabelo: "longo" },
            `${pele.id}/${olhos.id}/${cor.id}`,
          );
        }
      }
    }
  });

  it("vestir muda o desenho: bermuda mostra a perna, botas cobrem a canela, camiseta mostra o braço", () => {
    const pele = (e: EscolhasDoAvatar) =>
      quadrosDoAvatar("parado", e)[0]!
        .join("")
        .split("")
        .filter((c) => "syz".includes(c)).length;
    expect(pele({ ...BASE, equipados: { pernas: "bermuda" } })).toBeGreaterThan(
      pele({ ...BASE, equipados: { pernas: "calca" } }),
    );
    expect(pele({ ...BASE, equipados: { blusa: "camiseta" } })).toBeGreaterThan(
      pele({ ...BASE, equipados: { blusa: "moletom" } }),
    );
    expect(PADRAO).toEqual({ blusa: "camiseta", pernas: "calca", pes: "tenis" });
  });
});
