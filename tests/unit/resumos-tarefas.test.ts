import { describe, expect, it } from "vitest";
import {
  concluidasPorDia,
  constanciaDaSemana,
  manchete,
  nomeCurtoDoDia,
  nomeLongoDoDia,
  numeroDoDia,
  pontosPorDia,
  resumoDeHoje,
  semanaDe,
  totaisDaSemana,
} from "@/features/tasks/resumos";
import type { GrupoDeTarefa } from "@/features/tasks/datas";
import type { Tarefa } from "@/features/tasks/tipos";

const FUSO = "America/Sao_Paulo";
const HOJE = "2026-10-07"; // quarta-feira

let n = 0;
function tarefa(campos: Partial<Tarefa> & { grupo: GrupoDeTarefa }): Tarefa {
  n += 1;
  return {
    id: `t${n}`,
    user_id: "u",
    track_id: null,
    parent_id: null,
    title: `T${n}`,
    notes: "",
    priority: 2,
    status: campos.grupo === "concluida" ? "done" : "todo",
    start_on: null,
    due_on: null,
    due_time: null,
    estimate_min: null,
    completed_at: null,
    sort_order: 0,
    created_at: "2026-10-01T00:00:00Z",
    updated_at: "2026-10-01T00:00:00Z",
    ...campos,
  };
}

/** Concluída às 15:00 de SP (18:00Z) no dia informado. */
const feitaEm = (dia: string, extra: Partial<Tarefa> = {}) =>
  tarefa({ grupo: "concluida", completed_at: `${dia}T18:00:00Z`, ...extra });

describe("semanaDe", () => {
  it("segunda a domingo da semana que contém o dia", () => {
    expect(semanaDe("2026-10-07")).toEqual([
      "2026-10-05",
      "2026-10-06",
      "2026-10-07",
      "2026-10-08",
      "2026-10-09",
      "2026-10-10",
      "2026-10-11",
    ]);
  });

  it("segunda-feira abre a semana e domingo a fecha", () => {
    expect(semanaDe("2026-10-05")[0]).toBe("2026-10-05");
    expect(semanaDe("2026-10-11")[0]).toBe("2026-10-05");
    expect(semanaDe("2026-10-11")[6]).toBe("2026-10-11");
  });

  it("atravessa o fim do mês e do ano", () => {
    expect(semanaDe("2026-12-31")).toEqual([
      "2026-12-28",
      "2026-12-29",
      "2026-12-30",
      "2026-12-31",
      "2027-01-01",
      "2027-01-02",
      "2027-01-03",
    ]);
  });
});

describe("nomes e números do dia", () => {
  it("curto e longo em português", () => {
    expect(nomeCurtoDoDia("2026-10-05")).toBe("seg");
    expect(nomeCurtoDoDia("2026-10-10")).toBe("sáb");
    expect(nomeLongoDoDia("2026-10-07")).toBe("quarta-feira");
    expect(numeroDoDia("2026-10-05")).toBe(5);
    expect(numeroDoDia("2026-10-31")).toBe(31);
  });
});

describe("pontosPorDia", () => {
  it("conta só abertas, raiz, com prazo no dia", () => {
    const mae = tarefa({ grupo: "hoje", due_on: HOJE });
    const lista = [
      mae,
      tarefa({ grupo: "hoje", due_on: HOJE }),
      tarefa({ grupo: "hoje", due_on: HOJE, parent_id: mae.id }), // subtarefa: não conta
      feitaEm("2026-10-06", { due_on: HOJE }), // concluída: não conta
      tarefa({ grupo: "semana", due_on: "2026-10-09" }),
      tarefa({ grupo: "sem_prazo" }),
    ];
    const r = pontosPorDia(lista, semanaDe(HOJE));
    expect(r[HOJE]).toBe(2);
    expect(r["2026-10-09"]).toBe(1);
    expect(r["2026-10-05"]).toBe(0);
  });

  it("ignora tarefas fora dos dias pedidos", () => {
    const r = pontosPorDia([tarefa({ grupo: "depois", due_on: "2026-12-01" })], ["2026-10-07"]);
    expect(r).toEqual({ "2026-10-07": 0 });
  });
});

describe("concluidasPorDia (no fuso da pessoa)", () => {
  it("agrupa pelo dia local de conclusão", () => {
    const lista = [
      feitaEm("2026-10-07"),
      feitaEm("2026-10-07"),
      feitaEm("2026-10-06"),
      tarefa({ grupo: "hoje", due_on: HOJE }),
    ];
    const m = concluidasPorDia(lista, FUSO);
    expect(m.get("2026-10-07")).toBe(2);
    expect(m.get("2026-10-06")).toBe(1);
  });

  it("23:30 em São Paulo ainda é o mesmo dia (02:30Z do dia seguinte)", () => {
    const tarde = tarefa({ grupo: "concluida", completed_at: "2026-10-08T02:30:00Z" });
    expect(concluidasPorDia([tarde], FUSO).get("2026-10-07")).toBe(1);
    expect(concluidasPorDia([tarde], "UTC").get("2026-10-08")).toBe(1);
  });

  it("subtarefas concluídas não contam", () => {
    const mae = tarefa({ grupo: "hoje" });
    const filha = feitaEm("2026-10-07", { parent_id: mae.id });
    expect(concluidasPorDia([mae, filha], FUSO).size).toBe(0);
  });
});

describe("resumoDeHoje", () => {
  it("pendentes de hoje/atrasadas + concluídas hoje; percentual sobe ao concluir", () => {
    const lista = [
      tarefa({ grupo: "atrasada", due_on: "2026-10-05" }),
      tarefa({ grupo: "hoje", due_on: HOJE }),
      feitaEm(HOJE),
      feitaEm(HOJE),
      feitaEm("2026-10-05"), // outro dia: não conta
      tarefa({ grupo: "semana", due_on: "2026-10-09" }), // não é de hoje
    ];
    expect(resumoDeHoje(lista, HOJE, FUSO)).toEqual({
      total: 4,
      feitas: 2,
      pendentes: 2,
      percentual: 50,
    });
  });

  it("sem nada para fazer: 0% e total 0", () => {
    expect(resumoDeHoje([], HOJE, FUSO)).toEqual({
      total: 0,
      feitas: 0,
      pendentes: 0,
      percentual: 0,
    });
  });

  it("tudo concluído: 100%", () => {
    expect(resumoDeHoje([feitaEm(HOJE), feitaEm(HOJE)], HOJE, FUSO).percentual).toBe(100);
  });
});

describe("constanciaDaSemana", () => {
  it("7 dias com concluídas, hoje e futuro marcados", () => {
    const lista = [feitaEm("2026-10-05"), feitaEm("2026-10-05"), feitaEm("2026-10-07")];
    const semana = constanciaDaSemana(lista, HOJE, FUSO);
    expect(semana).toHaveLength(7);
    expect(semana[0]).toMatchObject({
      dia: "2026-10-05",
      rotulo: "seg",
      concluidas: 2,
      hoje: false,
    });
    expect(semana[1]).toMatchObject({ concluidas: 0 });
    expect(semana[2]).toMatchObject({ dia: HOJE, concluidas: 1, hoje: true, futuro: false });
    expect(semana[3]).toMatchObject({ futuro: true });
    expect(semana[6]).toMatchObject({ rotulo: "dom", futuro: true });
  });
});

describe("totaisDaSemana", () => {
  it("abertas (todas) e concluídas só desta semana", () => {
    const lista = [
      tarefa({ grupo: "hoje", due_on: HOJE }),
      tarefa({ grupo: "sem_prazo" }),
      feitaEm("2026-10-06"),
      feitaEm("2026-10-07"),
      feitaEm("2026-09-30"), // semana passada
    ];
    expect(totaisDaSemana(lista, HOJE, FUSO)).toEqual({ abertas: 2, concluidasNaSemana: 2 });
  });
});

describe("manchete (frase grande do Início)", () => {
  const resumo = (pendentes: number, feitas: number) => ({
    pendentes,
    feitas,
    total: pendentes + feitas,
    percentual: 0,
  });

  it("o que falta hoje, com singular e plural", () => {
    expect(manchete(resumo(1, 0), 4)).toEqual({
      antes: "Faltam ",
      destaque: "1 tarefa",
      depois: " para fechar o dia.",
    });
    expect(manchete(resumo(3, 2), 4).destaque).toBe("3 tarefas");
  });

  it("dia fechado quando não falta nada e algo foi concluído", () => {
    const m = manchete(resumo(0, 2), 0);
    expect(m.antes).toBe("Dia fechado. Você concluiu ");
    expect(m.destaque).toBe("2 tarefas");
    expect(manchete(resumo(0, 1), 0).destaque).toBe("1 tarefa");
  });

  it("nada hoje, mas há tarefas abertas em outros dias", () => {
    expect(manchete(resumo(0, 0), 3).destaque).toBe("depois");
  });

  it("sem nenhuma tarefa: convida a criar a primeira", () => {
    expect(manchete(resumo(0, 0), 0)).toEqual({
      antes: "Comece criando a sua ",
      destaque: "primeira tarefa",
      depois: ".",
    });
  });

  it("a frase montada lê bem de ponta a ponta", () => {
    const m = manchete(resumo(2, 0), 2);
    expect(`${m.antes}${m.destaque}${m.depois}`).toBe("Faltam 2 tarefas para fechar o dia.");
  });
});
