import { describe, expect, it } from "vitest";
import { agruparDoDia, agruparPorAba, resumir, subtarefasPorMae } from "@/features/tasks/agrupar";
import type { GrupoDeTarefa } from "@/features/tasks/datas";
import type { Tarefa } from "@/features/tasks/tipos";

let contador = 0;
/** Monta uma tarefa de teste com valores padrão sensatos. */
function tarefa(campos: Partial<Tarefa> & { grupo: GrupoDeTarefa }): Tarefa {
  contador += 1;
  return {
    id: `t${contador}`,
    user_id: "u",
    track_id: null,
    parent_id: null,
    title: `Tarefa ${contador}`,
    notes: "",
    priority: 2,
    status: campos.grupo === "concluida" ? "done" : "todo",
    due_on: null,
    due_time: null,
    estimate_min: null,
    completed_at: campos.grupo === "concluida" ? "2026-10-07T10:00:00Z" : null,
    sort_order: 0,
    created_at: `2026-10-0${(contador % 9) + 1}T00:00:00Z`,
    updated_at: "2026-10-07T00:00:00Z",
    ...campos,
  };
}

describe("agruparPorAba", () => {
  const atrasada = tarefa({ grupo: "atrasada", due_on: "2026-10-05" });
  const hoje = tarefa({ grupo: "hoje", due_on: "2026-10-07" });
  const semana = tarefa({ grupo: "semana", due_on: "2026-10-09" });
  const depois = tarefa({ grupo: "depois", due_on: "2026-10-30" });
  const semPrazo = tarefa({ grupo: "sem_prazo" });
  const feita = tarefa({ grupo: "concluida" });
  const todas = [atrasada, hoje, semana, depois, semPrazo, feita];

  const nomes = (aba: Parameters<typeof agruparPorAba>[1]) =>
    agruparPorAba(todas, aba).map((g) => [g.grupo, g.tarefas.length]);

  it("Hoje = atrasadas + hoje", () => {
    expect(nomes("hoje")).toEqual([
      ["atrasada", 1],
      ["hoje", 1],
    ]);
  });

  it("Semana = atrasadas + hoje + esta semana", () => {
    expect(nomes("semana")).toEqual([
      ["atrasada", 1],
      ["hoje", 1],
      ["semana", 1],
    ]);
  });

  it("Todas inclui depois e sem prazo, mas NÃO as concluídas", () => {
    expect(nomes("todas").map(([g]) => g)).toEqual([
      "atrasada",
      "hoje",
      "semana",
      "depois",
      "sem_prazo",
    ]);
  });

  it("Concluídas só mostra concluídas", () => {
    expect(nomes("concluidas")).toEqual([["concluida", 1]]);
  });

  it("'Atrasadas' tem tom de perigo; os outros, neutro", () => {
    const g = agruparPorAba(todas, "todas");
    expect(g.find((x) => x.grupo === "atrasada")?.tom).toBe("perigo");
    expect(g.filter((x) => x.grupo !== "atrasada").every((x) => x.tom === "neutro")).toBe(true);
  });

  it("subtarefas nunca aparecem soltas na lista", () => {
    const mae = tarefa({ grupo: "hoje", due_on: "2026-10-07" });
    const filha = tarefa({ grupo: "hoje", due_on: "2026-10-07", parent_id: mae.id });
    const g = agruparPorAba([mae, filha], "hoje").find((x) => x.grupo === "hoje");
    expect(g?.tarefas.map((t) => t.id)).toEqual([mae.id]);
  });
});

describe("ordem dentro do grupo", () => {
  it("prazo mais cedo primeiro, depois hora, depois prioridade alta", () => {
    const a = tarefa({ grupo: "semana", due_on: "2026-10-09", due_time: "19:00:00", priority: 1 });
    const b = tarefa({ grupo: "semana", due_on: "2026-10-08", priority: 1 });
    const c = tarefa({ grupo: "semana", due_on: "2026-10-09", due_time: "08:00:00", priority: 1 });
    const d = tarefa({ grupo: "semana", due_on: "2026-10-09", priority: 3 }); // sem hora: depois das com hora
    const ordem = agruparPorAba([a, b, c, d], "semana")
      .find((g) => g.grupo === "semana")
      ?.tarefas.map((t) => t.id);
    expect(ordem).toEqual([b.id, c.id, a.id, d.id]);
  });

  it("mesmo dia e sem hora: prioridade alta vem antes", () => {
    const baixa = tarefa({ grupo: "hoje", due_on: "2026-10-07", priority: 1 });
    const alta = tarefa({ grupo: "hoje", due_on: "2026-10-07", priority: 3 });
    const ordem = agruparPorAba([baixa, alta], "hoje")
      .find((g) => g.grupo === "hoje")
      ?.tarefas.map((t) => t.id);
    expect(ordem).toEqual([alta.id, baixa.id]);
  });

  it("concluídas: a mais recente primeiro", () => {
    const antiga = tarefa({ grupo: "concluida", completed_at: "2026-10-01T10:00:00Z" });
    const recente = tarefa({ grupo: "concluida", completed_at: "2026-10-06T10:00:00Z" });
    const ordem = agruparPorAba([antiga, recente], "concluidas")[0]?.tarefas.map((t) => t.id);
    expect(ordem).toEqual([recente.id, antiga.id]);
  });
});

describe("resumir", () => {
  it("conta abertas e atrasadas só entre tarefas-raiz", () => {
    const mae = tarefa({ grupo: "atrasada", due_on: "2026-10-05" });
    const filha = tarefa({ grupo: "atrasada", due_on: "2026-10-05", parent_id: mae.id });
    const feita = tarefa({ grupo: "concluida" });
    const normal = tarefa({ grupo: "hoje", due_on: "2026-10-07" });
    expect(resumir([mae, filha, feita, normal])).toEqual({ abertas: 2, atrasadas: 1 });
  });

  it("lista vazia", () => {
    expect(resumir([])).toEqual({ abertas: 0, atrasadas: 0 });
  });
});

describe("subtarefasPorMae", () => {
  it("agrupa por mãe e ordena por criação", () => {
    const mae = tarefa({ grupo: "hoje" });
    const b = tarefa({ grupo: "hoje", parent_id: mae.id, created_at: "2026-10-03T00:00:00Z" });
    const a = tarefa({ grupo: "hoje", parent_id: mae.id, created_at: "2026-10-02T00:00:00Z" });
    const mapa = subtarefasPorMae([mae, b, a]);
    expect(mapa.get(mae.id)?.map((t) => t.id)).toEqual([a.id, b.id]);
    expect(mapa.size).toBe(1);
  });
});

describe("agruparDoDia (toque num dia da faixa da semana)", () => {
  it("só tarefas daquele dia: abertas primeiro, concluídas no fim; título legível", () => {
    const aberta = tarefa({ grupo: "semana", due_on: "2026-10-09", priority: 3 });
    const outraAberta = tarefa({ grupo: "semana", due_on: "2026-10-09", priority: 1 });
    const feita = tarefa({ grupo: "concluida", due_on: "2026-10-09" });
    const outroDia = tarefa({ grupo: "semana", due_on: "2026-10-10" });
    const subtarefa = tarefa({ grupo: "semana", due_on: "2026-10-09", parent_id: aberta.id });
    const g = agruparDoDia([feita, outroDia, outraAberta, subtarefa, aberta], "2026-10-09");
    expect(g.titulo).toBe("Sexta-feira, 9");
    expect(g.tarefas.map((t) => t.id)).toEqual([aberta.id, outraAberta.id, feita.id]);
  });

  it("dia sem tarefas devolve lista vazia", () => {
    expect(agruparDoDia([], "2026-10-09").tarefas).toEqual([]);
  });
});
