import { describe, expect, it } from "vitest";
import { validarGrade } from "@/features/pixel/motor";
import { ANIMACOES, cabecaDeBocejo, quadrosDoConceito } from "@/features/pixel/conceitos/animacoes";
import {
  ACESSORIOS,
  CORES_NOVAS,
  EMOTES,
  OBJETOS,
  PALETA_EXTRA,
} from "@/features/pixel/conceitos/pecas-extras";
import { CATALOGO } from "@/features/pixel/pets/catalogo";
import { ESPECIES } from "@/features/pixel/pets/especies";

/** Conceitos de arte (para aprovação): conferem tamanhos, letras e cores. */
const LETRAS = new Set([..."osblpedxyt", ...Object.keys(PALETA_EXTRA)]);

describe("animações conceito", () => {
  it("têm códigos únicos (M1, M2…) e ao menos 2 quadros", () => {
    expect(new Set(ANIMACOES.map((a) => a.codigo)).size).toBe(ANIMACOES.length);
    for (const a of ANIMACOES) expect(a.quadros.length).toBeGreaterThanOrEqual(2);
  });

  for (const especie of ESPECIES) {
    it(`${especie}: todo quadro de toda animação, com ou sem acessório, tem o mesmo tamanho`, () => {
      const tamanhos = new Set<string>();
      for (const a of ANIMACOES) {
        for (const acessorio of [undefined, ...ACESSORIOS.map((x) => x.id)]) {
          for (const q of quadrosDoConceito(especie, a.id, { acessorio })) {
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
    expect(() => quadrosDoConceito("gato", "voar")).toThrow(/desconhecida/);
  });
});

describe("cores novas (padrões)", () => {
  it("cada cor nova cobre as letras da espécie e usa um id que não colide com as atuais", () => {
    for (const especie of ESPECIES) {
      const atuais = new Set(CATALOGO[especie].variacoes.map((v) => v.id));
      for (const cor of CORES_NOVAS[especie] ?? []) {
        expect(atuais.has(cor.id), `${especie}/${cor.id}`).toBe(false);
        const quadros = quadrosDoConceito(especie, "piscar", { padrao: cor.padrao });
        const usadas = new Set(quadros.flat().join("").replaceAll(".", ""));
        for (const s of usadas) {
          const temCor = cor.paleta[s] ?? PALETA_EXTRA[s];
          expect(temCor, `${especie}/${cor.id} sem cor para "${s}"`).toMatch(/^#[0-9a-f]{6}$/i);
        }
      }
    }
  });

  it("o padrão não muda a silhueta (mesmos pixels preenchidos que a cor lisa)", () => {
    const forma = (q: string[]) => q.map((l) => l.replace(/[^.]/g, "#")).join("/");
    for (const especie of ESPECIES) {
      for (const cor of CORES_NOVAS[especie] ?? []) {
        const liso = quadrosDoConceito(especie, "piscar")[0]!;
        const com = quadrosDoConceito(especie, "piscar", { padrao: cor.padrao })[0]!;
        expect(forma(com), `${especie}/${cor.id}`).toBe(forma(liso));
      }
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
