/**
 * Regras do Calendário do mês das Tarefas. Funções puras, sem tela (testáveis).
 *
 * A semana começa na SEGUNDA (como no resto do app). Cada tarefa com prazo ocupa um intervalo:
 * só prazo = um dia; "Começa em" + prazo = vários dias (barra). Tarefa sem prazo não aparece.
 * Subtarefas nunca aparecem (ficam dentro da tarefa-mãe).
 */
import { diaIso, diferencaDeDias, paraIso, somarDias } from "@/lib/datas";
import { ajustarDatas } from "./datas";
import type { Tarefa } from "./tipos";

export interface MesDoCalendario {
  ano: number;
  mes: number; // 1 a 12
}

export interface CelulaDoMes {
  dia: string;
  /** false = dia de outro mês (aparece esmaecido para completar a semana). */
  doMes: boolean;
}

const MESES = [
  "Janeiro",
  "Fevereiro",
  "Março",
  "Abril",
  "Maio",
  "Junho",
  "Julho",
  "Agosto",
  "Setembro",
  "Outubro",
  "Novembro",
  "Dezembro",
];

export const rotuloDoMes = (ano: number, mes: number) => `${MESES[mes - 1]} ${ano}`;

export function deslocarMes({ ano, mes }: MesDoCalendario, passos: number): MesDoCalendario {
  const indice = ano * 12 + (mes - 1) + passos;
  return { ano: Math.floor(indice / 12), mes: (indice % 12) + 1 };
}

/** Semanas (segunda a domingo) que cobrem o mês: de 4 a 6 linhas de 7 células. */
export function gradeDoMes(ano: number, mes: number): CelulaDoMes[][] {
  const primeiro = paraIso(ano, mes, 1);
  const proximo = deslocarMes({ ano, mes }, 1);
  const diasNoMes = diferencaDeDias(primeiro, paraIso(proximo.ano, proximo.mes, 1));
  const antes = diaIso(primeiro) - 1; // quantos dias da semana anterior entram
  const inicio = somarDias(primeiro, -antes);
  const linhas = Math.ceil((antes + diasNoMes) / 7);

  return Array.from({ length: linhas }, (_, l) =>
    Array.from({ length: 7 }, (_, c) => {
      const dia = somarDias(inicio, l * 7 + c);
      return { dia, doMes: dia.slice(0, 7) === primeiro.slice(0, 7) };
    }),
  );
}

export function intervaloDaTarefa(t: Tarefa): { inicio: string; fim: string } | null {
  if (!t.due_on) return null;
  return { inicio: t.start_on ?? t.due_on, fim: t.due_on };
}

/** Tarefas (só raízes) cujo intervalo inclui o dia; as que começam antes vêm primeiro. */
export function tarefasDoDia(tarefas: readonly Tarefa[], dia: string): Tarefa[] {
  return tarefas
    .filter((t) => {
      const i = t.parent_id === null ? intervaloDaTarefa(t) : null;
      return i !== null && i.inicio <= dia && dia <= i.fim;
    })
    .sort((a, b) => intervaloDaTarefa(a)!.inicio.localeCompare(intervaloDaTarefa(b)!.inicio));
}

export interface FaixaDaSemana {
  tarefa: Tarefa;
  /** Coluna inicial (0 = segunda … 6 = domingo) e quantas colunas a barra ocupa. */
  coluna: number;
  extensao: number;
  /** Linha da barra dentro da semana (0 = a de cima). */
  faixa: number;
  /** O período começa antes desta segunda / termina depois deste domingo (bordas retas). */
  continuaAntes: boolean;
  continuaDepois: boolean;
}

/**
 * Distribui as barras de UMA semana em faixas, sem sobreposição. Ordem: quem começa antes,
 * depois o período mais longo, depois o título (estável). Cada barra ocupa a primeira faixa livre.
 * Acima de `limite` faixas as barras ficam escondidas e `ocultasPorColuna` conta quantas há em
 * cada dia (a tela mostra "+N", porque a célula de um celular é pequena).
 */
export function faixasDaSemana(
  semana: readonly string[],
  tarefas: readonly Tarefa[],
  limite = 3,
): { faixas: FaixaDaSemana[]; totalDeFaixas: number; ocultasPorColuna: number[] } {
  const primeiro = semana[0]!;
  const ultimo = semana[6]!;

  const candidatas = tarefas.flatMap((tarefa) => {
    const i = tarefa.parent_id === null ? intervaloDaTarefa(tarefa) : null;
    if (!i || i.fim < primeiro || i.inicio > ultimo) return [];
    const inicioVisivel = i.inicio < primeiro ? primeiro : i.inicio;
    const fimVisivel = i.fim > ultimo ? ultimo : i.fim;
    return [
      {
        tarefa,
        coluna: diferencaDeDias(primeiro, inicioVisivel),
        extensao: diferencaDeDias(inicioVisivel, fimVisivel) + 1,
        continuaAntes: i.inicio < primeiro,
        continuaDepois: i.fim > ultimo,
      },
    ];
  });
  candidatas.sort(
    (a, b) =>
      a.coluna - b.coluna ||
      b.extensao - a.extensao ||
      a.tarefa.title.localeCompare(b.tarefa.title, "pt-BR"),
  );

  const ocupadas: boolean[][] = []; // ocupadas[faixa][coluna]
  const todas: FaixaDaSemana[] = candidatas.map((c) => {
    let faixa = 0;
    const cabe = (f: number) =>
      Array.from({ length: c.extensao }, (_, k) => c.coluna + k).every(
        (col) => !ocupadas[f]?.[col],
      );
    while (!cabe(faixa)) faixa += 1;
    ocupadas[faixa] ??= [];
    for (let k = 0; k < c.extensao; k += 1) ocupadas[faixa]![c.coluna + k] = true;
    return { ...c, faixa };
  });

  const ocultasPorColuna = Array.from({ length: 7 }, () => 0);
  for (const f of todas) {
    if (f.faixa < limite) continue;
    for (let k = 0; k < f.extensao; k += 1) ocultasPorColuna[f.coluna + k]! += 1;
  }
  return {
    faixas: todas.filter((f) => f.faixa < limite),
    totalDeFaixas: ocupadas.length,
    ocultasPorColuna,
  };
}

type Datas = { start_on: string | null; due_on: string | null };

/** Arrasta a barra inteira `dias` dias (negativo = para trás): início e prazo andam juntos. */
export function moverIntervalo(t: Tarefa, dias: number): Datas {
  if (!t.due_on) return { start_on: null, due_on: null };
  return {
    start_on: t.start_on ? somarDias(t.start_on, dias) : null,
    due_on: somarDias(t.due_on, dias),
  };
}

/** Puxa a ponta direita da barra até `novoFim`. */
export function esticarFim(t: Tarefa, novoFim: string): Datas {
  return ajustarDatas(t, { due_on: novoFim });
}

/** Puxa a ponta esquerda da barra até `novoInicio` (numa tarefa de um dia, cria o período). */
export function esticarInicio(t: Tarefa, novoInicio: string): Datas {
  return ajustarDatas(t, { start_on: novoInicio });
}
