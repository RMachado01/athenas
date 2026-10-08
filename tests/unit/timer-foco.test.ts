import { describe, expect, it } from "vitest";
import {
  CONFIG_PADRAO,
  decorrido,
  formatarRelogio,
  intervaloParaGravar,
  iniciar,
  lerEstado,
  pausar,
  proximaFase,
  restante,
  retomar,
  terminou,
  valeGravar,
} from "@/features/focus/timer";

const MIN = 60_000;
const T0 = 1_000_000;

describe("cronômetro Pomodoro", () => {
  it("começa rodando e conta o tempo pelo relógio", () => {
    const e = iniciar("foco", CONFIG_PADRAO, T0, { taskId: "t1" });
    expect(e.duracaoMs).toBe(25 * MIN);
    expect(e.taskId).toBe("t1");
    expect(decorrido(e, T0 + 10 * MIN)).toBe(10 * MIN);
    expect(restante(e, T0 + 10 * MIN)).toBe(15 * MIN);
    expect(terminou(e, T0 + 24 * MIN)).toBe(false);
    expect(terminou(e, T0 + 25 * MIN)).toBe(true);
  });

  it("nunca conta mais que a duração (aba esquecida aberta)", () => {
    const e = iniciar("foco", CONFIG_PADRAO, T0);
    expect(decorrido(e, T0 + 5 * 60 * MIN)).toBe(25 * MIN);
  });

  it("pausa congela o tempo e retomar continua de onde parou", () => {
    let e = iniciar("foco", CONFIG_PADRAO, T0);
    e = pausar(e, T0 + 10 * MIN);
    expect(decorrido(e, T0 + 99 * MIN)).toBe(10 * MIN);
    e = retomar(e, T0 + 100 * MIN);
    expect(decorrido(e, T0 + 105 * MIN)).toBe(15 * MIN);
  });

  it("pausar duas vezes ou retomar rodando não muda nada", () => {
    const rodando = iniciar("foco", CONFIG_PADRAO, T0);
    expect(retomar(rodando, T0 + MIN)).toBe(rodando);
    const parado = pausar(rodando, T0 + MIN);
    expect(pausar(parado, T0 + 2 * MIN)).toBe(parado);
  });

  it("pausas não carregam tarefa", () => {
    expect(iniciar("pausa", CONFIG_PADRAO, T0, { taskId: "t1" }).taskId).toBeNull();
  });
});

describe("sequência de fases", () => {
  it("foco → pausa curta até fechar o ciclo; então pausa longa; depois recomeça", () => {
    let e = iniciar("foco", CONFIG_PADRAO, T0, { ciclo: 0 });
    expect(proximaFase(e, CONFIG_PADRAO)).toEqual({ fase: "pausa", ciclo: 1 });

    e = iniciar("foco", CONFIG_PADRAO, T0, { ciclo: 3 }); // 4º foco do ciclo
    expect(proximaFase(e, CONFIG_PADRAO)).toEqual({ fase: "pausa-longa", ciclo: 4 });

    e = iniciar("pausa", CONFIG_PADRAO, T0, { ciclo: 1 });
    expect(proximaFase(e, CONFIG_PADRAO)).toEqual({ fase: "foco", ciclo: 1 });

    e = iniciar("pausa-longa", CONFIG_PADRAO, T0, { ciclo: 4 });
    expect(proximaFase(e, CONFIG_PADRAO)).toEqual({ fase: "foco", ciclo: 0 });
  });

  it("respeita ciclo e durações do perfil", () => {
    const cfg = { focoMin: 50, pausaMin: 10, pausaLongaMin: 30, cicloDe: 2 };
    const e = iniciar("foco", cfg, T0, { ciclo: 1 });
    expect(e.duracaoMs).toBe(50 * MIN);
    expect(proximaFase(e, cfg).fase).toBe("pausa-longa");
  });
});

describe("gravação da sessão", () => {
  it("o intervalo termina agora e começa `decorrido` antes (pausas não entram)", () => {
    let e = iniciar("foco", CONFIG_PADRAO, T0);
    e = pausar(e, T0 + 10 * MIN);
    e = retomar(e, T0 + 60 * MIN);
    const agora = T0 + 75 * MIN; // 10 + 15 = 25 min focados
    const r = intervaloParaGravar(e, agora);
    expect(r.fim.getTime()).toBe(agora);
    expect(r.fim.getTime() - r.inicio.getTime()).toBe(25 * MIN);
    expect(r.minutosPlanejados).toBe(25);
  });

  it("só vale gravar foco com pelo menos 1 minuto", () => {
    const e = iniciar("foco", CONFIG_PADRAO, T0);
    expect(valeGravar(e, T0 + 30_000)).toBe(false);
    expect(valeGravar(e, T0 + MIN)).toBe(true);
    expect(valeGravar(iniciar("pausa", CONFIG_PADRAO, T0), T0 + 4 * MIN)).toBe(false);
  });
});

describe("formatarRelogio", () => {
  it("formata mm:ss arredondando para cima", () => {
    expect(formatarRelogio(25 * MIN)).toBe("25:00");
    expect(formatarRelogio(24 * MIN + 59_001)).toBe("25:00");
    expect(formatarRelogio(61_000)).toBe("01:01");
    expect(formatarRelogio(0)).toBe("00:00");
    expect(formatarRelogio(-5)).toBe("00:00");
  });
});

describe("lerEstado (dado vindo do localStorage)", () => {
  const bom = iniciar("foco", CONFIG_PADRAO, T0, { taskId: "x" });

  it("aceita um estado válido", () => {
    expect(lerEstado(JSON.parse(JSON.stringify(bom)))).toEqual(bom);
  });

  it.each([
    null,
    "texto",
    {},
    { ...bom, fase: "outra" },
    { ...bom, duracaoMs: -1 },
    { ...bom, duracaoMs: 10 * 3_600_000 },
    { ...bom, ciclo: 1.5 },
    { ...bom, retomadoEm: "agora" },
    { ...bom, taskId: 5 },
    { ...bom, acumuladoMs: -10 },
  ])("rejeita lixo: %j", (x) => {
    expect(lerEstado(x)).toBeNull();
  });
});
