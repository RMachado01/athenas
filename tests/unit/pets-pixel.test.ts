import { describe, expect, it } from "vitest";
import { validarGrade } from "@/features/pixel/motor";
import { ESTADOS_DO_PET, quadrosDoPet, tamanhoDoPet } from "@/features/pixel/pets/animacoes";
import { acharVariacao, CATALOGO, ehEspecie, paletaDoPet } from "@/features/pixel/pets/catalogo";
import { ESPECIES, gradesDaEspecie } from "@/features/pixel/pets/especies";
import { ACESSORIOS, ehAcessorio } from "@/features/pixel/pets/pecas-extras";

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
        const { largura, altura } = tamanhoDoPet(especie);
        for (const estado of ESTADOS_DO_PET) {
          const quadros = quadrosDoPet(especie, estado);
          expect(quadros.length).toBeGreaterThanOrEqual(2);
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

      it("cada estado é uma animação própria e se mexe (tem ao menos 2 quadros diferentes)", () => {
        const assinatura = (q: string[]) => q.join("/");
        const porEstado = ESTADOS_DO_PET.map((e) =>
          quadrosDoPet(especie, e).map(assinatura).join("|"),
        );
        expect(new Set(porEstado).size).toBe(ESTADOS_DO_PET.length);
        for (const estado of ESTADOS_DO_PET) {
          const distintos = new Set(quadrosDoPet(especie, estado).map(assinatura));
          expect(distintos.size, `${especie}/${estado}: todos os quadros iguais`).toBeGreaterThan(
            1,
          );
        }
      });

      it("com acessório, o tamanho continua o mesmo (o pet não pula de lugar)", () => {
        const { largura, altura } = tamanhoDoPet(especie);
        for (const a of ACESSORIOS) {
          const [q] = quadrosDoPet(especie, "parado", { acessorio: a.id });
          expect([q![0]!.length, q!.length], `${especie}/${a.id}`).toEqual([largura, altura]);
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

  it("toda paleta cobre todas as letras do desenho, com padrão e acessório (nada sem cor)", () => {
    for (const especie of ESPECIES) {
      for (const v of CATALOGO[especie].variacoes) {
        const paleta = paletaDoPet(v);
        for (const acessorio of [null, ...ACESSORIOS.map((a) => a.id)]) {
          for (const estado of ESTADOS_DO_PET) {
            for (const q of quadrosDoPet(especie, estado, { variacao: v.id, acessorio })) {
              for (const linha of q) {
                for (const s of linha) {
                  if (s === ".") continue;
                  expect(paleta[s], `${especie}/${v.id}/${acessorio} sem cor para "${s}"`).toMatch(
                    /^#[0-9a-f]{6}$/i,
                  );
                }
              }
            }
          }
        }
      }
    }
  });

  it("as variações de uma espécie têm cores diferentes (no gato-banana: banana + gatinho)", () => {
    for (const info of Object.values(CATALOGO)) {
      const cores = info.variacoes.map((v) => `${v.paleta.x ?? ""}/${v.paleta.b}`);
      expect(new Set(cores).size, info.id).toBe(cores.length);
    }
  });

  it("as pelagens com padrão aprovadas estão no catálogo", () => {
    const ids = (e: keyof typeof CATALOGO) => CATALOGO[e].variacoes.map((v) => v.id);
    expect(ids("gato")).toEqual(expect.arrayContaining(["tigrado", "frajola", "siames"]));
    expect(ids("macaco")).toContain("mico");
    expect(ids("capivara")).toContain("ruiva");
    expect(ids("gato_banana")).toContain("madura");
  });

  it("ehAcessorio só aceita acessórios do catálogo", () => {
    expect(ehAcessorio("fone")).toBe(true);
    expect(ehAcessorio("coroa")).toBe(false);
    expect(ehAcessorio(null)).toBe(false);
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
