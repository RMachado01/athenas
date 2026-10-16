import { describe, expect, it } from "vitest";
import { validarGrade } from "@/features/pixel/motor";
import { acharVariacao, CATALOGO, ehEspecie } from "@/features/pixel/pets/catalogo";
import {
  ESPECIES,
  ESTADOS_DO_PET,
  gradesDaEspecie,
  quadrosDoPet,
  tamanhoDaEspecie,
} from "@/features/pixel/pets/especies";

/** Símbolos que um desenho pode usar (o "o" é o contorno automático, posto pelo motor). */
const SIMBOLOS = new Set(["o", "b", "s", "l", "p", "e", "d", "x", "y", "t"]);

describe("desenhos dos pets", () => {
  for (const especie of ESPECIES) {
    describe(especie, () => {
      it("toda peça é retangular e só usa letras conhecidas", () => {
        for (const [nome, grade] of Object.entries(gradesDaEspecie(especie))) {
          expect(validarGrade(grade, SIMBOLOS), `${especie}/${nome}`).toEqual([]);
        }
      });

      it("todos os quadros de todos os estados têm o MESMO tamanho (a faixa exige)", () => {
        const { largura, altura } = tamanhoDaEspecie(especie);
        for (const estado of ESTADOS_DO_PET) {
          const quadros = quadrosDoPet(especie, estado);
          expect(quadros).toHaveLength(2);
          for (const q of quadros) {
            expect(q.length, `${especie}/${estado}`).toBe(altura);
            expect(q.every((l) => l.length === largura)).toBe(true);
          }
        }
      });

      it("tem contorno e nada encosta na borda da tela (sobra 1 pixel de margem)", () => {
        for (const estado of ESTADOS_DO_PET) {
          for (const q of quadrosDoPet(especie, estado)) {
            expect(q.join("")).toContain("o");
            expect(q[0]).toMatch(/^[.o]*$/); // primeira linha: só contorno/vazio
            expect(q[q.length - 1]).toMatch(/^[.o]*$/);
            expect(q.every((l) => /^[.o]/.test(l) && /[.o]$/.test(l))).toBe(true);
          }
        }
      });

      it("os estados são diferentes entre si e os 2 quadros do ciclo também", () => {
        const assinatura = (q: string[]) => q.join("/");
        const todos = ESTADOS_DO_PET.flatMap((e) => quadrosDoPet(especie, e).map(assinatura));
        // parado, andando, dormindo e feliz: ao menos 7 desenhos distintos em 8
        expect(new Set(todos).size).toBeGreaterThanOrEqual(7);
        for (const estado of ESTADOS_DO_PET) {
          const [a, b] = quadrosDoPet(especie, estado);
          expect(assinatura(a!), `${especie}/${estado}: 2 quadros iguais`).not.toBe(assinatura(b!));
        }
      });

      it("o pet dormindo fica no chão (a base dele não sobe em relação ao pet em pé)", () => {
        const baseDe = (q: string[]) => {
          for (let j = q.length - 1; j >= 0; j -= 1) if (/[^.o]/.test(q[j]!)) return j;
          return -1;
        };
        const emPe = baseDe(quadrosDoPet(especie, "parado")[0]!);
        const deitado = baseDe(quadrosDoPet(especie, "dormindo")[0]!);
        expect(deitado).toBe(emPe);
      });
    });
  }
});

describe("catálogo", () => {
  it("tem as 4 espécies, cada uma com ao menos 3 cores de nomes e ids únicos", () => {
    expect(Object.keys(CATALOGO).sort()).toEqual([...ESPECIES].sort());
    for (const info of Object.values(CATALOGO)) {
      expect(info.variacoes.length).toBeGreaterThanOrEqual(3);
      expect(new Set(info.variacoes.map((v) => v.id)).size).toBe(info.variacoes.length);
      expect(new Set(info.variacoes.map((v) => v.nome)).size).toBe(info.variacoes.length);
    }
  });

  it("toda paleta cobre todas as letras que a espécie usa (nada sem cor)", () => {
    for (const especie of ESPECIES) {
      const usadas = new Set<string>();
      for (const estado of ESTADOS_DO_PET) {
        for (const q of quadrosDoPet(especie, estado)) {
          for (const linha of q) for (const s of linha) if (s !== ".") usadas.add(s);
        }
      }
      for (const v of CATALOGO[especie].variacoes) {
        for (const s of usadas) {
          expect(v.paleta[s], `${especie}/${v.id} sem cor para "${s}"`).toMatch(/^#[0-9a-f]{6}$/i);
        }
      }
    }
  });

  it("as variações de uma espécie têm cores de corpo diferentes", () => {
    for (const info of Object.values(CATALOGO)) {
      const corpos = info.variacoes.map((v) => v.paleta.b ?? v.paleta.x);
      expect(new Set(corpos).size).toBe(corpos.length);
    }
  });

  it("acharVariacao devolve a pedida, ou a primeira se o id não existir", () => {
    expect(acharVariacao("gato", "preto").id).toBe("preto");
    expect(acharVariacao("gato", "inexistente").id).toBe("laranja");
  });

  it("ehEspecie só aceita espécies do catálogo", () => {
    expect(ehEspecie("capivara")).toBe(true);
    expect(ehEspecie("dragao")).toBe(false);
    expect(ehEspecie(42)).toBe(false);
  });
});
