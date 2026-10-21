import { describe, expect, it } from "vitest";
import { ANIMACOES, quadrosDoConceito } from "@/features/pixel/conceitos/animacoes";
import { ESPECIES, ESTADOS_DO_PET, moldeDe, quadrosDoPet } from "@/features/pixel/pets/especies";

/**
 * Feedback do Renan: "as patas descolam do corpo". Regra: no desenho de um pet não pode existir
 * uma linha SEM preenchimento entre o corpo e as patas (só contorno = faixa escura separando).
 * Olhamos as linhas com preenchimento (qualquer letra que não seja "." nem o contorno "o"):
 * da primeira à última, nenhuma pode faltar.
 */
function linhasSemPreenchimentoNoMeio(q: string[]): number[] {
  const comPreenchimento = q.map((l) => /[^.o]/.test(l));
  const primeira = comPreenchimento.indexOf(true);
  const ultima = comPreenchimento.lastIndexOf(true);
  const buracos: number[] = [];
  for (let j = primeira; j <= ultima; j += 1) if (!comPreenchimento[j]) buracos.push(j);
  return buracos;
}

describe("patas sempre coladas no corpo", () => {
  for (const especie of ESPECIES) {
    it(`${especie}: estados do app`, () => {
      for (const estado of ESTADOS_DO_PET) {
        quadrosDoPet(especie, estado).forEach((q, i) => {
          expect(linhasSemPreenchimentoNoMeio(q), `${especie}/${estado} quadro ${i}`).toEqual([]);
        });
      }
    });

    it(`${especie}: animações conceito`, () => {
      for (const a of ANIMACOES) {
        quadrosDoConceito(especie, a.id).forEach((q, i) => {
          expect(linhasSemPreenchimentoNoMeio(q), `${especie}/${a.id} quadro ${i}`).toEqual([]);
        });
      }
    });
  }
});

describe("patas embaixo da barriga", () => {
  for (const especie of ESPECIES) {
    it(`${especie}: cada pata começa sobreposta ao corpo e com barriga logo acima`, () => {
      const m = moldeDe(especie);
      const { corpo: c, pernas: p } = m.em_pe;
      // A 1ª linha das patas cai DENTRO do corpo (sobreposição), nunca abaixo dele.
      expect(p.y).toBeLessThanOrEqual(c.y + m.corpo.length - 1);
      const linhaAcima = m.corpo[p.y - c.y - 1]!;
      for (const pernas of [m.pernasA, m.pernasB]) {
        Array.from(pernas![0]!).forEach((ch, i) => {
          if (ch === ".") return;
          expect(linhaAcima[i + p.x - c.x], `${especie} coluna ${i}`).not.toBe(".");
        });
      }
    });
  }
});
