import { describe, expect, it } from "vitest";
import {
  CARINHO_MS,
  VELOCIDADE_MS_POR_TELA,
  acordar,
  carinho,
  cochilo,
  comemorar,
  planoDaBolinha,
  planoDoPetisco,
  direcaoPara,
  proximaDecisao,
} from "@/features/pixel/estados";
import { animacaoDoEstado, ESTADOS_DO_PET } from "@/features/pixel/pets/animacoes";

/** Sorteio previsível: devolve os números da lista, na ordem (e repete o último). */
const sorteio = (...valores: number[]) => {
  let i = 0;
  return () => valores[Math.min(i++, valores.length - 1)]!;
};

describe("proximaDecisao a partir de parado", () => {
  it("sorteio baixo = vai andar", () => {
    const d = proximaDecisao("parado", 0.3, sorteio(0.1, 0.5, 0.5));
    expect(d.estado).toBe("andando");
    expect(d.alvo).toBeDefined();
  });

  it("sorteio médio = continua parado, por alguns segundos", () => {
    const d = proximaDecisao("parado", 0.3, sorteio(0.55, 0.5));
    expect(d.estado).toBe("parado");
    expect(d.duracaoMs).toBeGreaterThanOrEqual(2500);
    expect(d.duracaoMs).toBeLessThanOrEqual(6000);
  });

  it("sorteio alto = vai dormir, por bastante tempo", () => {
    const d = proximaDecisao("parado", 0.3, sorteio(0.95, 0.5));
    expect(d.estado).toBe("dormindo");
    expect(d.duracaoMs).toBeGreaterThanOrEqual(8000);
  });

  it("de vez em quando boceja: UMA vez (a duração é um ciclo da animação)", () => {
    const d = proximaDecisao("parado", 0.3, sorteio(0.68));
    expect(d).toEqual({ estado: "bocejando", duracaoMs: animacaoDoEstado("bocejando").cicloMs });
  });

  it("às vezes deita para descansar (acordado), por alguns segundos", () => {
    const d = proximaDecisao("parado", 0.3, sorteio(0.8, 0.5));
    expect(d.estado).toBe("descansando");
    expect(d.duracaoMs).toBeGreaterThanOrEqual(6000);
    expect(d.duracaoMs).toBeLessThanOrEqual(12000);
  });
});

describe("andar", () => {
  it("o alvo fica dentro da tela (de 5% a 95%) e a caminhada tem pelo menos 20%", () => {
    for (const pos of [0.05, 0.2, 0.5, 0.8, 0.95]) {
      for (const r of [0, 0.25, 0.5, 0.75, 0.999]) {
        const d = proximaDecisao("parado", pos, sorteio(0, r, r));
        expect(d.estado).toBe("andando");
        expect(d.alvo!).toBeGreaterThanOrEqual(0.05);
        expect(d.alvo!).toBeLessThanOrEqual(0.95);
        expect(Math.abs(d.alvo! - pos)).toBeGreaterThanOrEqual(0.2 - 1e-9);
      }
    }
  });

  it("a duração acompanha a distância (velocidade constante)", () => {
    const d = proximaDecisao("parado", 0.1, sorteio(0, 0.5, 0.5));
    const distancia = Math.abs(d.alvo! - 0.1);
    expect(d.duracaoMs).toBeCloseTo(distancia * VELOCIDADE_MS_POR_TELA, 0);
  });

  it("encostado numa borda, anda para o lado de dentro", () => {
    expect(proximaDecisao("parado", 0.95, sorteio(0, 0.5, 0.5)).alvo!).toBeLessThan(0.95);
    expect(proximaDecisao("parado", 0.05, sorteio(0, 0.5, 0.5)).alvo!).toBeGreaterThan(0.05);
  });

  it("direcaoPara diz 1 (direita) ou -1 (esquerda)", () => {
    expect(direcaoPara(0.2, 0.7)).toBe(1);
    expect(direcaoPara(0.7, 0.2)).toBe(-1);
  });
});

describe("outros estados", () => {
  it("andando quase sempre vira parado; às vezes anda mais", () => {
    expect(proximaDecisao("andando", 0.5, sorteio(0.3, 0.5)).estado).toBe("parado");
    expect(proximaDecisao("andando", 0.5, sorteio(0.9, 0, 0.5, 0.5)).estado).toBe("andando");
  });

  it("dormindo: ronca mais um pouco ou acorda se espreguiçando (um ciclo)", () => {
    expect(proximaDecisao("dormindo", 0.5, sorteio(0.1, 0.5)).estado).toBe("dormindo");
    expect(proximaDecisao("dormindo", 0.5, sorteio(0.9, 0.5))).toEqual({
      estado: "espreguicando",
      duracaoMs: animacaoDoEstado("espreguicando").cicloMs,
    });
  });

  it("depois de se espreguiçar, fica parado", () => {
    expect(proximaDecisao("espreguicando", 0.5, sorteio(0.5)).estado).toBe("parado");
  });

  it("depois do bocejo: parado na maioria das vezes; às vezes deita ou cochila", () => {
    expect(proximaDecisao("bocejando", 0.5, sorteio(0.9, 0.5)).estado).toBe("parado");
    expect(proximaDecisao("bocejando", 0.5, sorteio(0.1, 0.5)).estado).toBe("descansando");
    expect(proximaDecisao("bocejando", 0.5, sorteio(0.3, 0.5)).estado).toBe("dormindo");
  });

  it("descansando: cochila ou levanta", () => {
    expect(proximaDecisao("descansando", 0.5, sorteio(0.1, 0.5)).estado).toBe("dormindo");
    expect(proximaDecisao("descansando", 0.5, sorteio(0.9, 0.5)).estado).toBe("parado");
  });

  it("o pulinho do carinho termina em feliz", () => {
    expect(proximaDecisao("pulando", 0.5, sorteio(0.5))).toEqual({
      estado: "feliz",
      duracaoMs: CARINHO_MS,
    });
  });

  it("correndo e comendo (ações) voltam a parado", () => {
    expect(proximaDecisao("correndo", 0.5, sorteio(0.5)).estado).toBe("parado");
    expect(proximaDecisao("comendo", 0.5, sorteio(0.5)).estado).toBe("parado");
  });

  it("feliz volta a ser parado", () => {
    expect(proximaDecisao("feliz", 0.5, sorteio(0.9, 0.5)).estado).not.toBe("feliz");
  });

  it("nunca devolve duração zero ou negativa", () => {
    for (const estado of ESTADOS_DO_PET) {
      for (const r of [0, 0.3, 0.6, 0.99]) {
        expect(proximaDecisao(estado, 0.5, sorteio(r, r, r)).duracaoMs).toBeGreaterThan(0);
      }
    }
  });
});

describe("carinho", () => {
  it("começa com um pulinho (um ciclo da animação M4)", () => {
    expect(carinho()).toEqual({
      estado: "pulando",
      duracaoMs: animacaoDoEstado("pulando").cicloMs,
    });
  });
});

describe("roteiro do petisco (S2)", () => {
  it("a tigela fica do lado com mais espaço; o pet anda até ela, come e fica feliz", () => {
    const r = planoDoPetisco(0.2, sorteio(0.5), false);
    expect(r.objetoEm).toBeGreaterThanOrEqual(0.8);
    expect(r.passos.map((p) => p.estado)).toEqual(["andando", "comendo", "feliz"]);
    expect(r.passos[0]!.alvo).toBe(r.objetoEm);
    expect(r.passos[0]!.duracaoMs).toBe(
      Math.round(Math.abs(r.objetoEm - 0.2) * VELOCIDADE_MS_POR_TELA),
    );
    expect(r.passos[1]!.duracaoMs).toBe(3 * animacaoDoEstado("comendo").cicloMs);
    expect(planoDoPetisco(0.9, sorteio(0.5), false).objetoEm).toBeLessThanOrEqual(0.2);
  });

  it("com reduzir movimento, a tigela aparece onde o pet está e ele não anda", () => {
    const r = planoDoPetisco(0.4, sorteio(0.5), true);
    expect(r.objetoEm).toBe(0.4);
    expect(r.passos.map((p) => p.estado)).toEqual(["comendo", "feliz"]);
  });
});

describe("roteiro da bolinha (S3)", () => {
  it("a bolinha para longe (25%+), o pet CORRE (2x mais rápido que andar) e pula", () => {
    for (const pos of [0.05, 0.3, 0.5, 0.7, 0.95]) {
      for (const r of [0, 0.5, 0.999]) {
        const plano = planoDaBolinha(pos, sorteio(r), false);
        expect(plano.objetoEm).toBeGreaterThanOrEqual(0.05);
        expect(plano.objetoEm).toBeLessThanOrEqual(0.95);
        expect(Math.abs(plano.objetoEm - pos)).toBeGreaterThanOrEqual(0.25 - 1e-9);
        const [corrida, pulo, feliz] = plano.passos;
        expect(corrida).toMatchObject({ estado: "correndo", alvo: plano.objetoEm });
        expect(corrida!.duracaoMs).toBe(
          Math.round((Math.abs(plano.objetoEm - pos) * VELOCIDADE_MS_POR_TELA) / 2),
        );
        expect(pulo!.estado).toBe("pulando");
        expect(feliz!.estado).toBe("feliz");
      }
    }
  });

  it("com reduzir movimento, sem corrida", () => {
    const plano = planoDaBolinha(0.6, sorteio(0.5), true);
    expect(plano.objetoEm).toBe(0.6);
    expect(plano.passos.map((p) => p.estado)).toEqual(["pulando", "feliz"]);
  });
});

describe("cochilo (S6) e comemorar (S5)", () => {
  it("cochilo = dormir por bastante tempo; acordar = se espreguiçar", () => {
    expect(cochilo()).toMatchObject({ estado: "dormindo" });
    expect(cochilo().duracaoMs).toBeGreaterThanOrEqual(60_000);
    expect(acordar()).toEqual({
      estado: "espreguicando",
      duracaoMs: animacaoDoEstado("espreguicando").cicloMs,
    });
  });

  it("comemorar = pulinho e feliz", () => {
    expect(comemorar().map((p) => p.estado)).toEqual(["pulando", "pulando", "feliz"]);
  });
});
