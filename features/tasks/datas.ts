/**
 * Regras de data específicas das tarefas (grupo e texto do prazo).
 * As funções genéricas de data (hoje no fuso, somar dias…) ficam em lib/datas.ts.
 *
 * `calcularGrupo` espelha a regra da view SQL `v_tasks` (migration 0003): existe aqui só para a
 * tela reagir NA HORA (otimista) antes de o banco confirmar. Os testes garantem que as duas
 * regras andam juntas.
 */
import { diaIso, diferencaDeDias, somarDias } from "@/lib/datas";

export type GrupoDeTarefa = "atrasada" | "hoje" | "semana" | "depois" | "sem_prazo" | "concluida";

/**
 * Grupo da tarefa. Mesma regra da view v_tasks:
 *  concluída · sem prazo · atrasada (antes de hoje) · hoje ·
 *  semana (de amanhã até o domingo desta semana) · depois.
 */
export function calcularGrupo(
  tarefa: { status: string; due_on: string | null },
  hoje: string,
): GrupoDeTarefa {
  if (tarefa.status === "done") return "concluida";
  if (!tarefa.due_on) return "sem_prazo";
  if (tarefa.due_on < hoje) return "atrasada";
  if (tarefa.due_on === hoje) return "hoje";
  const domingo = somarDias(hoje, 7 - diaIso(hoje));
  return tarefa.due_on <= domingo ? "semana" : "depois";
}

const DIA_CURTO = new Intl.DateTimeFormat("pt-BR", { weekday: "short", timeZone: "UTC" });

/**
 * Texto do prazo, como no design: "hoje, 19:00" · "amanhã" · "ontem" · "sex, 09/10".
 * Sem prazo devolve null (a tela simplesmente não mostra nada).
 */
export function formatarPrazo(
  dueOn: string | null,
  dueTime: string | null,
  hoje: string,
): string | null {
  if (!dueOn) return null;

  const dif = diferencaDeDias(hoje, dueOn);
  let base: string;
  if (dif === 0) base = "hoje";
  else if (dif === 1) base = "amanhã";
  else if (dif === -1) base = "ontem";
  else {
    const [ano, mes, dia] = dueOn.split("-");
    const semana = DIA_CURTO.format(
      new Date(Date.UTC(Number(ano), Number(mes) - 1, Number(dia))),
    ).replace(".", "");
    base = `${semana}, ${dia}/${mes}`;
  }

  // O banco devolve "19:00:00"; mostramos "19:00".
  return dueTime ? `${base}, ${dueTime.slice(0, 5)}` : base;
}

/**
 * "Começa em" + prazo: mantém as duas datas coerentes (o banco confere de novo, ver o check
 * `tasks_inicio_coerente`). Recebe as datas ATUAIS da tarefa e o que a pessoa mudou:
 *  - sem prazo não há início (a barra de vários dias precisa dos dois extremos);
 *  - prazo antes do início → o início acompanha o prazo;
 *  - início depois do prazo → o prazo acompanha o início (como esticar/empurrar no Notion).
 */
export function ajustarDatas(
  atual: { start_on: string | null; due_on: string | null },
  mudanca: { start_on?: string | null; due_on?: string | null },
): { start_on: string | null; due_on: string | null } {
  let due = "due_on" in mudanca ? (mudanca.due_on ?? null) : atual.due_on;
  let start = "start_on" in mudanca ? (mudanca.start_on ?? null) : atual.start_on;
  if (due === null) return { start_on: null, due_on: null };
  if (start !== null && start > due) {
    if ("start_on" in mudanca && !("due_on" in mudanca)) due = start;
    else start = due;
  }
  return { start_on: start, due_on: due };
}
