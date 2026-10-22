import { describe, expect, it } from "vitest";
import { validarGrade } from "@/features/pixel/motor";
import { ANIMACOES, cabecaDeBocejo, quadrosDaAnimacao } from "@/features/pixel/pets/animacoes";
import { ACESSORIOS, EMOTES, OBJETOS, PALETA_EXTRA } from "@/features/pixel/pets/pecas-extras";
import { CATALOGO } from "@/features/pixel/pets/catalogo";
import { ESPECIES } from "@/features/pixel/pets/especies";

/** Movimentos, padrões, emotes e objetos: conferem tamanhos, letras e cores. */
const LETRAS = new Set([..."osblpedxyt", ...Object.keys(PALETA_EXTRA)]);

describe("animações", () => {
  it("têm códigos únicos (M1, M2…) e ao menos 2 quadros", () => {
    expect(new Set(ANIMACOES.map((a) => a.codigo)).size).toBe(ANIMACOES.length);
    for (const a of ANIMACOES) expect(a.quadros.length).toBeGreaterThanOrEqual(2);
  });

  for (const especie of ESPECIES) {
    it(`${especie}: todo quadro de toda animação, com ou sem acessório, tem o mesmo tamanho`, () => {
      const tamanhos = new Set<string>();
      for (const a of ANIMACOES) {
        for (const acessorio of [undefined, ...ACESSORIOS.map((x) => x.id)]) {
          for (const q of quadrosDaAnimacao(especie, a.id, { acessorio })) {
            tamanhos.add(`${q[0]!.length}x${q.length}`);
            expect(validarGrade(q, LETRAS), `${especie}/${a.id}/${acessorio}`).toEqual([]);
          }
        }
      }
      expect(tamanhos.size).toBe(1);
    });

    it(`${especie}: o bocejo é uma cabeça do mesmo tamanho, com boca aberta`, () => {
      const bocejo = cabecaDeBocejo(especie);
      expect(bocejo.join("")).toContain("m");
      expect(validarGrade(bocejo, LETRAS)).toEqual([]);
    });
  }

  it("a animação pedida não existe = erro claro", () => {
    expect(() => quadrosDaAnimacao("gato", "voar")).toThrow(/desconhecida/);
  });
});

describe("pelagens com padrão", () => {
  const comPadrao = ESPECIES.flatMap((e) =>
    CATALOGO[e].variacoes.filter((v) => v.padrao).map((v) => [e, v] as const),
  );

  it("existem (tigrado, frajola, siamês, banana madura)", () => {
    expect(comPadrao.length).toBeGreaterThanOrEqual(4);
  });

  it("o padrão não muda a silhueta (mesmos pixels preenchidos que a cor lisa)", () => {
    const forma = (q: string[]) => q.map((l) => l.replace(/[^.]/g, "#")).join("/");
    for (const [especie, v] of comPadrao) {
      const liso = quadrosDaAnimacao(especie, "piscar")[0]!;
      const com = quadrosDaAnimacao(especie, "piscar", { padrao: v.padrao })[0]!;
      expect(forma(com), `${especie}/${v.id}`).toBe(forma(liso));
      expect(com.join("/"), `${especie}/${v.id}: o padrão não aparece`).not.toBe(liso.join("/"));
    }
  });
});

describe("emotes e objetos", () => {
  it("todos os emotes são balões de 11 x 10 com letras conhecidas", () => {
    expect(new Set(EMOTES.map((e) => e.id)).size).toBe(EMOTES.length);
    for (const e of EMOTES) {
      expect(e.grade).toHaveLength(10);
      expect(validarGrade(e.grade, LETRAS), e.id).toEqual([]);
      expect(e.grade[0]!.length).toBe(11);
    }
  });

  it("objetos de cena são grades válidas", () => {
    for (const [nome, g] of Object.entries(OBJETOS)) {
      expect(validarGrade(g, LETRAS), nome).toEqual([]);
    }
  });
});
