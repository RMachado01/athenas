import { describe, expect, it } from "vitest";
import {
  camposAoMover,
  camposDeNovaTarefa,
  montarColunas,
  SEM_TRILHA,
} from "@/features/tasks/quadro";
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
const trilhas = [
  { id: "sql", name: "SQL", color: "azul" as const },
  { id: "py", name: "Python", color: "verde" as const },
];

describe("montarColunas por status", () => {
  it("cria A fazer, Fazendo e Feito, nessa ordem, mesmo vazias", () => {
    const cols = montarColunas([], "status", trilhas);
    expect(cols.map((c) => [c.id, c.titulo])).toEqual([
      ["todo", "A fazer"],
      ["doing", "Fazendo"],
      ["done", "Feito"],
    ]);
  });

  it("distribui por status e ignora subtarefas", () => {
    const mae = t({ status: "doing" });
    const cols = montarColunas(
      [
        t(),
        mae,
        t({ status: "done", completed_at: "2026-10-05T10:00:00Z" }),
        t({ parent_id: mae.id }),
      ],
      "status",
      trilhas,
    );
    expect(cols.map((c) => c.tarefas.length)).toEqual([1, 1, 1]);
  });

  it("Feito mostra as mais recentes primeiro", () => {
    const velha = t({ status: "done", completed_at: "2026-10-01T10:00:00Z" });
    const nova = t({ status: "done", completed_at: "2026-10-05T10:00:00Z" });
    const done = montarColunas([velha, nova], "status", trilhas)[2]!;
    expect(done.tarefas.map((x) => x.id)).toEqual([nova.id, velha.id]);
  });
});

describe("montarColunas por trilha", () => {
  it("uma coluna por trilha (com a cor dela) e 'Sem trilha' por último", () => {
    const cols = montarColunas([t({ track_id: "py" }), t()], "trilha", trilhas);
    expect(cols.map((c) => [c.id, c.cor])).toEqual([
      ["sql", "azul"],
      ["py", "verde"],
      [SEM_TRILHA, null],
    ]);
    expect(cols.map((c) => c.tarefas.length)).toEqual([0, 1, 1]);
  });

  it("não mostra tarefas concluídas (o Quadro por trilha é o que ainda falta fazer)", () => {
    const cols = montarColunas(
      [t({ track_id: "sql", status: "done", completed_at: "2026-10-05T10:00:00Z" })],
      "trilha",
      trilhas,
    );
    expect(cols[0]!.tarefas).toHaveLength(0);
  });
});

describe("montarColunas por prioridade", () => {
  it("Alta, Média e Baixa, só tarefas abertas", () => {
    const cols = montarColunas(
      [
        t({ priority: 3 }),
        t({ priority: 1 }),
        t({ priority: 1 }),
        t({ priority: 3, status: "done" }),
      ],
      "prioridade",
      trilhas,
    );
    expect(cols.map((c) => [c.titulo, c.tarefas.length])).toEqual([
      ["Alta", 1],
      ["Média", 0],
      ["Baixa", 2],
    ]);
  });
});

describe("camposAoMover", () => {
  it("status, trilha e prioridade viram o campo certo", () => {
    expect(camposAoMover("status", "doing")).toEqual({ status: "doing" });
    expect(camposAoMover("trilha", "sql")).toEqual({ track_id: "sql" });
    expect(camposAoMover("trilha", SEM_TRILHA)).toEqual({ track_id: null });
    expect(camposAoMover("prioridade", "3")).toEqual({ priority: 3 });
  });
});

describe("camposDeNovaTarefa (+ Nova dentro da coluna)", () => {
  it("a tarefa já nasce na coluna onde foi criada", () => {
    expect(camposDeNovaTarefa("status", "doing")).toEqual({ status: "doing" });
    expect(camposDeNovaTarefa("trilha", "py")).toEqual({ track_id: "py" });
    expect(camposDeNovaTarefa("trilha", SEM_TRILHA)).toEqual({});
    expect(camposDeNovaTarefa("prioridade", "1")).toEqual({ priority: 1 });
  });

  it("na coluna Feito não se cria tarefa nova", () => {
    expect(camposDeNovaTarefa("status", "done")).toBeNull();
  });
});
