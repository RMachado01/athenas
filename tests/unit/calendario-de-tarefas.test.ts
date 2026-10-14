import { describe, expect, it } from "vitest";
import {
  deslocarMes,
  esticarFim,
  esticarInicio,
  faixasDaSemana,
  gradeDoMes,
  intervaloDaTarefa,
  moverIntervalo,
  rotuloDoMes,
  tarefasDoDia,
} from "@/features/tasks/calendario";
import type { Tarefa } from "@/features/tasks/tipos";

let n = 0;
function t(campos: Partial<Tarefa> = {}): Tarefa {
  n += 1;
  return {
    id: `t${n}`,
    user_id: "u",
    track_id: null,
    parent_id: null,
    title: `Tarefa ${n}`,
    notes: "",
    priority: 2,
    status: "todo",
    start_on: null,
    due_on: null,
    due_time: null,
    estimate_min: null,
    completed_at: null,
    sort_order: 0,
    created_at: "2026-10-01T00:00:00Z",
    updated_at: "2026-10-01T00:00:00Z",
    grupo: "sem_prazo",
    ...campos,
  };
}

describe("gradeDoMes", () => {
  it("outubro/2026 tem 5 semanas começando na segunda 28/09 e terminando domingo 01/11", () => {
    const g = gradeDoMes(2026, 10);
    expect(g).toHaveLength(5);
    expect(g.every((s) => s.length === 7)).toBe(true);
    expect(g[0]![0]).toEqual({ dia: "2026-09-28", doMes: false });
    expect(g[0]![3]).toEqual({ dia: "2026-10-01", doMes: true }); // quinta
    expect(g[4]![6]).toEqual({ dia: "2026-11-01", doMes: false });
  });

  it("agosto/2026 precisa de 6 semanas", () => {
    const g = gradeDoMes(2026, 8);
    expect(g).toHaveLength(6);
    expect(g[0]![0]!.dia).toBe("2026-07-27");
    expect(g[5]![0]).toEqual({ dia: "2026-08-31", doMes: true });
  });

  it("fevereiro/2027 (começa na segunda e tem 28 dias) cabe em 4 semanas", () => {
    const g = gradeDoMes(2027, 2);
    expect(g).toHaveLength(4);
    expect(g[0]![0]).toEqual({ dia: "2027-02-01", doMes: true });
    expect(g[3]![6]).toEqual({ dia: "2027-02-28", doMes: true });
  });
});

describe("mês: rótulo e navegação", () => {
  it("rotulo em português", () => {
    expect(rotuloDoMes(2026, 10)).toBe("Outubro 2026");
    expect(rotuloDoMes(2027, 3)).toBe("Março 2027");
  });

  it("deslocarMes vira o ano", () => {
    expect(deslocarMes({ ano: 2026, mes: 12 }, 1)).toEqual({ ano: 2027, mes: 1 });
    expect(deslocarMes({ ano: 2026, mes: 1 }, -1)).toEqual({ ano: 2025, mes: 12 });
    expect(deslocarMes({ ano: 2026, mes: 10 }, 0)).toEqual({ ano: 2026, mes: 10 });
  });
});

describe("intervaloDaTarefa", () => {
  it("só prazo = um dia; início + prazo = período; sem prazo = nada", () => {
    expect(intervaloDaTarefa(t({ due_on: "2026-10-15" }))).toEqual({
      inicio: "2026-10-15",
      fim: "2026-10-15",
    });
    expect(intervaloDaTarefa(t({ start_on: "2026-10-13", due_on: "2026-10-17" }))).toEqual({
      inicio: "2026-10-13",
      fim: "2026-10-17",
    });
    expect(intervaloDaTarefa(t())).toBeNull();
  });
});

describe("tarefasDoDia", () => {
  it("inclui as que atravessam o dia, ignora subtarefas e sem prazo", () => {
    const barra = t({ start_on: "2026-10-13", due_on: "2026-10-17" });
    const dia = t({ due_on: "2026-10-15" });
    const outra = t({ due_on: "2026-10-20" });
    const sub = t({ due_on: "2026-10-15", parent_id: barra.id });
    const lista = [barra, dia, outra, sub, t()];
    expect(tarefasDoDia(lista, "2026-10-15").map((x) => x.id)).toEqual([barra.id, dia.id]);
    expect(tarefasDoDia(lista, "2026-10-12")).toEqual([]);
  });
});

describe("faixasDaSemana", () => {
  const semana = [
    "2026-10-12",
    "2026-10-13",
    "2026-10-14",
    "2026-10-15",
    "2026-10-16",
    "2026-10-17",
    "2026-10-18",
  ];

  it("posiciona barras em colunas e faixas, sem sobrepor", () => {
    const antes = t({ title: "Antes", start_on: "2026-10-08", due_on: "2026-10-14" });
    const meio = t({ title: "Python", start_on: "2026-10-13", due_on: "2026-10-17" });
    const solta = t({ title: "Solta", due_on: "2026-10-15" });
    const fora = t({ title: "Fora", due_on: "2026-10-20" });
    const r = faixasDaSemana(semana, [meio, solta, antes, fora, t()]);
    const por = (titulo: string) => r.faixas.find((f) => f.tarefa.title === titulo)!;

    expect(por("Antes")).toMatchObject({
      coluna: 0,
      extensao: 3,
      faixa: 0,
      continuaAntes: true,
      continuaDepois: false,
    });
    expect(por("Python")).toMatchObject({
      coluna: 1,
      extensao: 5,
      faixa: 1,
      continuaAntes: false,
      continuaDepois: false,
    });
    expect(por("Solta")).toMatchObject({ coluna: 3, extensao: 1, faixa: 0 });
    expect(r.faixas.some((f) => f.tarefa.title === "Fora")).toBe(false);
    expect(r.totalDeFaixas).toBe(2);
  });

  it("marca continuaDepois quando o período passa do domingo", () => {
    const longa = t({ start_on: "2026-10-16", due_on: "2026-10-22" });
    const [f] = faixasDaSemana(semana, [longa]).faixas;
    expect(f).toMatchObject({ coluna: 4, extensao: 3, continuaAntes: false, continuaDepois: true });
  });

  it("acima do limite de faixas, esconde e conta por dia", () => {
    const quatro = ["a", "b", "c", "d"].map((x) => t({ title: x, due_on: "2026-10-14" }));
    const r = faixasDaSemana(semana, quatro, 3);
    expect(r.faixas.filter((f) => f.faixa < 3)).toHaveLength(3);
    expect(r.faixas).toHaveLength(3);
    expect(r.ocultasPorColuna).toEqual([0, 0, 1, 0, 0, 0, 0]);
  });

  it("ordem estável: período mais longo primeiro quando começam juntos", () => {
    const curta = t({ title: "curta", due_on: "2026-10-12" });
    const longa = t({ title: "longa", start_on: "2026-10-12", due_on: "2026-10-14" });
    const r = faixasDaSemana(semana, [curta, longa]);
    expect(r.faixas.find((f) => f.tarefa.title === "longa")!.faixa).toBe(0);
    expect(r.faixas.find((f) => f.tarefa.title === "curta")!.faixa).toBe(1);
  });
});

describe("mover e esticar", () => {
  it("moverIntervalo desloca início e prazo juntos", () => {
    expect(moverIntervalo(t({ start_on: "2026-10-13", due_on: "2026-10-17" }), 7)).toEqual({
      start_on: "2026-10-20",
      due_on: "2026-10-24",
    });
    expect(moverIntervalo(t({ due_on: "2026-10-15" }), -2)).toEqual({
      start_on: null,
      due_on: "2026-10-13",
    });
  });

  it("moverIntervalo atravessa a virada do mês", () => {
    expect(moverIntervalo(t({ start_on: "2026-10-30", due_on: "2026-11-02" }), 3)).toEqual({
      start_on: "2026-11-02",
      due_on: "2026-11-05",
    });
  });

  it("esticarFim muda só o prazo; antes do início, o período vira um dia", () => {
    const base = t({ start_on: "2026-10-13", due_on: "2026-10-17" });
    expect(esticarFim(base, "2026-10-20")).toEqual({
      start_on: "2026-10-13",
      due_on: "2026-10-20",
    });
    expect(esticarFim(base, "2026-10-10")).toEqual({
      start_on: "2026-10-10",
      due_on: "2026-10-10",
    });
  });

  it("esticarInicio muda só o início; depois do prazo, o prazo acompanha", () => {
    const base = t({ start_on: "2026-10-13", due_on: "2026-10-17" });
    expect(esticarInicio(base, "2026-10-11")).toEqual({
      start_on: "2026-10-11",
      due_on: "2026-10-17",
    });
    expect(esticarInicio(base, "2026-10-19")).toEqual({
      start_on: "2026-10-19",
      due_on: "2026-10-19",
    });
  });

  it("esticarInicio numa tarefa de um dia cria o período até o prazo", () => {
    expect(esticarInicio(t({ due_on: "2026-10-15" }), "2026-10-13")).toEqual({
      start_on: "2026-10-13",
      due_on: "2026-10-15",
    });
  });
});
