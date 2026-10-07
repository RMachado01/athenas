import { describe, expect, it } from "vitest";
import { calcularGrupo, formatarPrazo } from "@/features/tasks/datas";
import { diferencaDeDias, hojeNoFuso } from "@/lib/datas";

const HOJE = "2026-10-07"; // quarta-feira

describe("hojeNoFuso", () => {
  it("o mesmo instante é dias diferentes em fusos diferentes", () => {
    // 7/out 02:00 UTC = 6/out 23:00 em São Paulo (UTC-3) = 7/out 11:00 em Tóquio (UTC+9)
    const instante = new Date("2026-10-07T02:00:00Z");
    expect(hojeNoFuso("America/Sao_Paulo", instante)).toBe("2026-10-06");
    expect(hojeNoFuso("Asia/Tokyo", instante)).toBe("2026-10-07");
    expect(hojeNoFuso("UTC", instante)).toBe("2026-10-07");
  });

  it("fuso inválido não quebra (usa São Paulo)", () => {
    const instante = new Date("2026-10-07T02:00:00Z");
    expect(hojeNoFuso("Nao/Existe", instante)).toBe("2026-10-06");
  });
});

describe("diferencaDeDias", () => {
  it("conta dias de calendário", () => {
    expect(diferencaDeDias("2026-10-07", "2026-10-08")).toBe(1);
    expect(diferencaDeDias("2026-10-07", "2026-10-06")).toBe(-1);
    expect(diferencaDeDias("2026-10-07", "2026-10-07")).toBe(0);
    expect(diferencaDeDias("2026-12-31", "2027-01-02")).toBe(2);
  });
});

describe("calcularGrupo (espelha a view v_tasks)", () => {
  const g = (status: string, due_on: string | null) => calcularGrupo({ status, due_on }, HOJE);

  it("concluída vence qualquer prazo", () => {
    expect(g("done", "2026-10-01")).toBe("concluida");
    expect(g("done", null)).toBe("concluida");
  });

  it("sem prazo, atrasada e hoje", () => {
    expect(g("todo", null)).toBe("sem_prazo");
    expect(g("todo", "2026-10-06")).toBe("atrasada");
    expect(g("doing", "2026-10-07")).toBe("hoje");
  });

  it("semana vai de amanhã até domingo (11/10) e depois disso é 'depois'", () => {
    expect(g("todo", "2026-10-08")).toBe("semana");
    expect(g("todo", "2026-10-11")).toBe("semana");
    expect(g("todo", "2026-10-12")).toBe("depois");
  });

  it("quando hoje é domingo, amanhã já é 'depois'", () => {
    expect(calcularGrupo({ status: "todo", due_on: "2026-10-12" }, "2026-10-11")).toBe("depois");
  });

  it("quando hoje é segunda, a semana vai até domingo", () => {
    expect(calcularGrupo({ status: "todo", due_on: "2026-10-18" }, "2026-10-12")).toBe("semana");
    expect(calcularGrupo({ status: "todo", due_on: "2026-10-19" }, "2026-10-12")).toBe("depois");
  });
});

describe("formatarPrazo (texto do design)", () => {
  it("sem prazo não mostra nada", () => {
    expect(formatarPrazo(null, null, HOJE)).toBeNull();
  });

  it("hoje, amanhã e ontem em palavras", () => {
    expect(formatarPrazo("2026-10-07", null, HOJE)).toBe("hoje");
    expect(formatarPrazo("2026-10-08", null, HOJE)).toBe("amanhã");
    expect(formatarPrazo("2026-10-06", null, HOJE)).toBe("ontem");
  });

  it("outros dias: dia da semana curto + data", () => {
    expect(formatarPrazo("2026-10-09", null, HOJE)).toBe("sex, 09/10");
    expect(formatarPrazo("2026-10-05", null, HOJE)).toBe("seg, 05/10");
    expect(formatarPrazo("2026-10-24", null, HOJE)).toBe("sáb, 24/10");
  });

  it("com hora (o banco devolve HH:MM:SS, mostramos HH:MM)", () => {
    expect(formatarPrazo("2026-10-07", "19:00:00", HOJE)).toBe("hoje, 19:00");
    expect(formatarPrazo("2026-10-09", "08:30", HOJE)).toBe("sex, 09/10, 08:30");
  });
});
