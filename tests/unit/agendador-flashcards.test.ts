import { describe, expect, it } from "vitest";
import { estadoNovo, previa, responder, rotuloDoIntervalo } from "@/features/flashcards/agendador";

const agora = new Date("2026-10-12T12:00:00Z");

describe("agendador FSRS", () => {
  it("cartão novo: estado 0, vence agora, sem revisões", () => {
    expect(estadoNovo(agora)).toMatchObject({
      state: 0,
      reps: 0,
      lapses: 0,
      last_review: null,
      due: agora.toISOString(),
    });
  });

  it("prévia dá intervalos crescentes de Errei a Fácil", () => {
    const p = previa(estadoNovo(agora), agora);
    const due = (n: 1 | 2 | 3 | 4) => Date.parse(p[n].estado.due);
    expect(due(1)).toBeLessThanOrEqual(due(2));
    expect(due(2)).toBeLessThanOrEqual(due(3));
    expect(due(3)).toBeLessThan(due(4));
    expect(p[1].intervalo).toMatch(/min$/);
  });

  it("responder é igual à prévia (o botão mostra o que vai acontecer)", () => {
    const e = estadoNovo(agora);
    expect(responder(e, 3, agora)).toEqual(previa(e, agora)[3].estado);
  });

  it("responder sobe reps em 1 e grava last_review", () => {
    const depois = responder(estadoNovo(agora), 3, agora);
    expect(depois.reps).toBe(1);
    expect(depois.last_review).toBe(agora.toISOString());
  });

  it("ida e volta com o formato do banco (strings ISO) não perde nada", () => {
    const um = responder(estadoNovo(agora), 4, agora);
    const dias = new Date(Date.parse(um.due) + 60_000);
    const dois = responder(JSON.parse(JSON.stringify(um)), 3, dias);
    expect(dois.reps).toBe(2);
    expect(dois.state).toBe(2);
  });

  it("rótulos curtos dos intervalos", () => {
    const m = (ms: number) => rotuloDoIntervalo(agora, new Date(agora.getTime() + ms));
    expect(m(30_000)).toBe("<1 min");
    expect(m(10 * 60_000)).toBe("10 min");
    expect(m(3 * 3_600_000)).toBe("3 h");
    expect(m(4 * 86_400_000)).toBe("4 d");
    expect(m(45 * 86_400_000)).toBe("1,5 m");
    expect(m(400 * 86_400_000)).toBe("1,1 a");
  });
});

describe("por que a revisão grava a PRÉVIA (e não recalcula)", () => {
  it("o mesmo cartão respondido segundos depois pode cair noutro dia (fuzz usa o instante)", () => {
    // Cartão maduro: intervalos longos, onde o "fuzz" espalha a data em vários dias.
    let e = estadoNovo(agora);
    let t = agora;
    for (let i = 0; i < 6; i++) {
      e = responder(e, 3, t);
      t = new Date(Date.parse(e.due));
    }
    const dias = (x: { due: string }) => Math.round((Date.parse(x.due) - t.getTime()) / 86_400_000);
    const instantes = Array.from({ length: 30 }, (_, i) => new Date(t.getTime() + i * 1000));
    const resultados = new Set(instantes.map((q) => dias(responder(e, 3, q))));
    expect(resultados.size).toBeGreaterThan(1);
  });
});
