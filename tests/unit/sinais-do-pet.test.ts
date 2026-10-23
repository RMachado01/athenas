import { describe, expect, it } from "vitest";
import { montarSinais, type DadosDosSinais } from "@/features/pixel/sinais";

// 15:00Z = 12:00 em São Paulo, 22 de outubro.
const AGORA = new Date("2026-10-22T15:00:00Z");

const base: DadosDosSinais = {
  tarefas: [],
  dias: [],
  metaMin: 120,
  notas: [],
  timer: null,
  ultimaVisita: null,
  agora: AGORA,
  fuso: "America/Sao_Paulo",
};
const com = (m: Partial<DadosDosSinais>) => montarSinais({ ...base, ...m });

const tarefa = (grupo: string, extra: Partial<{ parent_id: string | null; status: string }> = {}) =>
  ({ parent_id: null, status: "todo", grupo, ...extra }) as DadosDosSinais["tarefas"][number];

describe("montarSinais", () => {
  it("sem dados: nada acontecendo (primeira visita, nunca estudou)", () => {
    expect(montarSinais(base)).toMatchObject({
      focoRodando: false,
      tarefasHoje: 0,
      tarefasAtrasadas: 0,
      diasSemVir: null,
      diasSemEstudar: null,
      notasNovas: 0,
      noite: false,
    });
  });

  it("conta só tarefas principais e abertas, de hoje e atrasadas", () => {
    const s = com({
      tarefas: [
        tarefa("hoje"),
        tarefa("hoje"),
        tarefa("hoje", { status: "done" }),
        tarefa("hoje", { parent_id: "x" }),
        tarefa("atrasada"),
        tarefa("semana"),
      ],
    });
    expect([s.tarefasHoje, s.tarefasAtrasadas]).toEqual([2, 1]);
  });

  it("Pomodoro: só conta FOCO rodando e ainda não terminado", () => {
    const foco = {
      fase: "foco" as const,
      ciclo: 0,
      duracaoMs: 25 * 60_000,
      taskId: null,
      retomadoEm: AGORA.getTime() - 60_000,
      acumuladoMs: 0,
    };
    expect(com({ timer: foco }).focoRodando).toBe(true);
    expect(com({ timer: { ...foco, retomadoEm: null } }).focoRodando).toBe(false); // pausado
    expect(com({ timer: { ...foco, fase: "pausa" } }).focoRodando).toBe(false);
    expect(com({ timer: { ...foco, retomadoEm: AGORA.getTime() - 26 * 60_000 } }).focoRodando).toBe(
      false,
    ); // já acabou (o Foco não estava aberto para virar a fase)
  });

  it("minutos de hoje e dias desde o último estudo (no fuso da pessoa)", () => {
    const s = com({
      dias: [
        { dia: "2026-10-22", minutos: 40, sessoes: 2 },
        { dia: "2026-10-18", minutos: 25, sessoes: 1 },
      ],
    });
    expect(s.minutosHoje).toBe(40);
    expect(s.diasSemEstudar).toBe(0);
    expect(com({ dias: [{ dia: "2026-10-18", minutos: 25, sessoes: 1 }] }).diasSemEstudar).toBe(4);
    // Dia com 0 minutos não conta como estudo.
    expect(com({ dias: [{ dia: "2026-10-21", minutos: 0, sessoes: 0 }] }).diasSemEstudar).toBe(
      null,
    );
  });

  it("última visita: dias sem vir e notas editadas depois dela", () => {
    const s = com({
      ultimaVisita: "2026-10-18T15:00:00Z",
      notas: [{ atualizadaEm: "2026-10-20T10:00:00Z" }, { atualizadaEm: "2026-10-17T10:00:00Z" }],
    });
    expect(s.diasSemVir).toBe(4);
    expect(s.notasNovas).toBe(1);
    expect(com({ ultimaVisita: "isso não é data" }).diasSemVir).toBe(null);
  });

  it("noite no fuso da pessoa", () => {
    expect(com({ agora: new Date("2026-10-22T02:00:00Z") }).noite).toBe(true); // 23h em SP
  });
});
