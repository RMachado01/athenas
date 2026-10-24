/**
 * REAÇÕES do pet (E2–E8): a partir do que está acontecendo nos estudos ("sinais"), o pet mostra
 * um balãozinho e a Sala escreve um recado. Função pura e testada: quem junta os sinais é o hook
 * `useSinaisDoPet`; aqui só se decide O QUE dizer e em que ordem (o mais urgente primeiro).
 */

export interface SinaisDoPet {
  /** Um Pomodoro de FOCO está rodando (não pausado). */
  focoRodando: boolean;
  /** Tarefas abertas (só as principais, sem subtarefas) com prazo hoje / já vencido. */
  tarefasHoje: number;
  tarefasAtrasadas: number;
  /** Dias desde a última visita à Sala (null = primeira visita). */
  diasSemVir: number | null;
  minutosHoje: number;
  metaMin: number;
  /** Dias desde o último dia com foco (null = nunca estudou com o cronômetro). */
  diasSemEstudar: number | null;
  /** Notas criadas ou editadas desde a última visita à Sala. */
  notasNovas: number;
  /** 22h às 5h59 no fuso da pessoa. */
  noite: boolean;
}

export const SINAIS_VAZIOS: SinaisDoPet = {
  focoRodando: false,
  tarefasHoje: 0,
  tarefasAtrasadas: 0,
  diasSemVir: null,
  minutosHoje: 0,
  metaMin: 120,
  diasSemEstudar: null,
  notasNovas: 0,
  noite: false,
};

/** Ids dos balões (os desenhos estão em EMOTES, pets/pecas-extras.ts). */
export type EmoteDaReacao =
  "musica" | "exclamacao" | "interrogacao" | "gota" | "estrela" | "ideia" | "zz";

export interface Reacao {
  emote: EmoteDaReacao;
  /** Recado curto, em minúsculas: a Sala escreve "Mingau: <texto>". */
  texto: string;
  link?: { href: string; rotulo: string };
}

const plural = (n: number, um: string, varios: string) => `${n} ${n === 1 ? um : varios}`;

/** "1 tarefa para hoje" · "2 tarefas para hoje e 1 atrasada" · "3 tarefas atrasadas". */
function textoDasTarefas(hoje: number, atrasadas: number): string {
  const deHoje = hoje > 0 ? `${plural(hoje, "tarefa", "tarefas")} para hoje` : "";
  if (atrasadas === 0) return deHoje;
  if (!deHoje) return `${plural(atrasadas, "tarefa atrasada", "tarefas atrasadas")}`;
  return `${deHoje} e ${atrasadas} ${atrasadas === 1 ? "atrasada" : "atrasadas"}`;
}

/** Foco a partir do qual o pet sugere uma pausa (E6): 1,5x a meta, nunca menos de 150 min. */
export const limiteDePausa = (metaMin: number) => Math.max(150, Math.round(metaMin * 1.5));

/** As reações do momento, da mais urgente para a menos. Lista vazia = nada a dizer. */
export function reacoesDoPet(s: SinaisDoPet): Reacao[] {
  const lista: Reacao[] = [];

  if (s.focoRodando) lista.push({ emote: "musica", texto: "estudando junto com você" });

  if (s.tarefasHoje > 0 || s.tarefasAtrasadas > 0) {
    lista.push({
      emote: "exclamacao",
      texto: textoDasTarefas(s.tarefasHoje, s.tarefasAtrasadas),
      link: { href: "/tarefas", rotulo: "Ver tarefas" },
    });
  }

  if (s.diasSemVir !== null && s.diasSemVir >= 3) {
    lista.push({
      emote: "interrogacao",
      texto: `que saudade! faz ${s.diasSemVir} dias que você não aparece`,
    });
  }

  // Muito estudo vence a comemoração: primeiro cuidar de descansar.
  if (s.minutosHoje >= limiteDePausa(s.metaMin)) {
    lista.push({ emote: "gota", texto: "você estudou muito hoje: que tal uma pausa?" });
  } else if (s.metaMin > 0 && s.minutosHoje >= s.metaMin) {
    lista.push({ emote: "estrela", texto: "meta de hoje batida!" });
  }

  if (s.notasNovas > 0) {
    lista.push({
      emote: "ideia",
      texto: `${plural(s.notasNovas, "nota nova", "notas novas")} desde a última visita`,
      link: { href: "/notas", rotulo: "Ver notas" },
    });
  }

  // Sono: de noite, pede descanso; de dia, depois de 2+ dias parado, convida para o Foco.
  // Durante um Pomodoro não faz sentido convidar a estudar.
  if (s.noite) {
    lista.push({ emote: "zz", texto: "já é tarde… descanse também" });
  } else if (!s.focoRodando && s.diasSemEstudar !== null && s.diasSemEstudar >= 2) {
    lista.push({
      emote: "zz",
      texto: `faz ${s.diasSemEstudar} dias sem estudar: bora um pouquinho?`,
      link: { href: "/foco", rotulo: "Abrir o Foco" },
    });
  }

  return lista;
}

/** Hora (0–23) no fuso dado. */
function horaNoFuso(agora: Date, fuso: string): number {
  const texto = new Intl.DateTimeFormat("en-GB", {
    hour: "2-digit",
    hourCycle: "h23",
    timeZone: fuso,
  }).format(agora);
  return Number(texto);
}

/** É noite (22h às 5h59) no fuso da pessoa? */
export function ehNoite(agora: Date, fuso: string): boolean {
  const h = horaNoFuso(agora, fuso);
  return h >= 22 || h < 6;
}
