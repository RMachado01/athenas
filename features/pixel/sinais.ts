"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useDiasDeFoco } from "@/features/focus/queries";
import { minutosDoDia, type DiaDeFoco } from "@/features/focus/resumos";
import { lerEstado, terminou, type EstadoDoTimer } from "@/features/focus/timer";
import { useNotas } from "@/features/notes/queries";
import { useTarefas } from "@/features/tasks/queries";
import type { Tarefa } from "@/features/tasks/tipos";
import { diferencaDeDias, hojeNoFuso } from "@/lib/datas";
import { usePerfil } from "@/lib/perfil";
import { ehNoite, SINAIS_VAZIOS, type SinaisDoPet } from "./reacoes";

/** Onde o cronômetro do Foco guarda o estado (o mesmo de features/focus/use-timer.ts). */
export const CHAVE_DO_FOCO = "athenas-foco";
/** Quando a pessoa abriu a Sala pela última vez (ISO). */
export const CHAVE_DA_VISITA = "athenas-sala-visita";

export interface DadosDosSinais {
  tarefas: readonly Pick<Tarefa, "parent_id" | "status" | "grupo">[];
  dias: readonly DiaDeFoco[];
  metaMin: number;
  notas: readonly { atualizadaEm: string }[];
  timer: EstadoDoTimer | null;
  /** Visita anterior à Sala (ISO), ou null na primeira vez. */
  ultimaVisita: string | null;
  agora: Date;
  fuso: string;
}

/** Junta os dados do app nos sinais que o pet entende (função pura: testada à parte). */
export function montarSinais(d: DadosDosSinais): SinaisDoPet {
  const hoje = hojeNoFuso(d.fuso, d.agora);
  const abertas = d.tarefas.filter((t) => t.parent_id === null && t.status !== "done");
  const ultimoDiaComFoco = d.dias
    .filter((x) => x.minutos > 0)
    .map((x) => x.dia)
    .sort()
    .at(-1);
  const visita = d.ultimaVisita ? new Date(d.ultimaVisita) : null;
  const visitaValida = visita && !Number.isNaN(visita.getTime()) ? visita : null;

  return {
    focoRodando:
      d.timer !== null &&
      d.timer.fase === "foco" &&
      d.timer.retomadoEm !== null &&
      !terminou(d.timer, d.agora.getTime()),
    tarefasHoje: abertas.filter((t) => t.grupo === "hoje").length,
    tarefasAtrasadas: abertas.filter((t) => t.grupo === "atrasada").length,
    diasSemVir: visitaValida
      ? Math.max(0, diferencaDeDias(hojeNoFuso(d.fuso, visitaValida), hoje))
      : null,
    minutosHoje: minutosDoDia(d.dias, hoje),
    metaMin: d.metaMin,
    diasSemEstudar: ultimoDiaComFoco ? Math.max(0, diferencaDeDias(ultimoDiaComFoco, hoje)) : null,
    notasNovas: visitaValida
      ? d.notas.filter((n) => new Date(n.atualizadaEm) > visitaValida).length
      : 0,
    noite: ehNoite(d.agora, d.fuso),
  };
}

function lerDoArmazenamento(chave: string): string | null {
  try {
    return window.localStorage.getItem(chave);
  } catch {
    return null; // aba privada / armazenamento bloqueado: segue sem esse sinal
  }
}

function lerTimer(): EstadoDoTimer | null {
  const bruto = lerDoArmazenamento(CHAVE_DO_FOCO);
  if (!bruto) return null;
  try {
    return lerEstado(JSON.parse(bruto));
  } catch {
    return null;
  }
}

/** De quanto em quanto tempo a Sala confere de novo o cronômetro e a hora. */
const RECONFERIR_MS = 5_000;

/**
 * Os sinais do pet, ao vivo: busca tarefas, foco e notas (as mesmas consultas das outras telas,
 * então quase sempre já estão em cache) e lê o cronômetro do Foco no aparelho. Marca a visita
 * de agora (a próxima visita compara com ela). `pronto` = os dados chegaram (ou falharam).
 */
export function useSinaisDoPet(): { sinais: SinaisDoPet; pronto: boolean } {
  const { data: perfil } = usePerfil();
  const tarefas = useTarefas();
  const dias = useDiasDeFoco();
  const notas = useNotas();

  const [ultimaVisita, setUltimaVisita] = useState<string | null>(null);
  const [timer, setTimer] = useState<EstadoDoTimer | null>(null);
  const [agora, setAgora] = useState<Date | null>(null);
  // Em desenvolvimento o React roda os efeitos 2 vezes: sem esta trava, a 2ª vez leria a visita
  // que a 1ª acabou de gravar (e a saudade/notas novas sumiriam).
  const visitaLida = useRef(false);

  useEffect(() => {
    // Lê a visita anterior UMA vez e marca a de agora.
    if (!visitaLida.current) {
      visitaLida.current = true;

      setUltimaVisita(lerDoArmazenamento(CHAVE_DA_VISITA));
      try {
        window.localStorage.setItem(CHAVE_DA_VISITA, new Date().toISOString());
      } catch {
        /* sem armazenamento: a saudade (E3) e as notas novas (E7) só não aparecem */
      }
    }
    const conferir = () => {
      setTimer(lerTimer());
      setAgora(new Date());
    };
    conferir();
    const id = window.setInterval(conferir, RECONFERIR_MS);
    // Outra aba mexeu no cronômetro: confere na hora.
    const aoMudar = (e: StorageEvent) => {
      if (e.key === CHAVE_DO_FOCO) conferir();
    };
    window.addEventListener("storage", aoMudar);
    return () => {
      window.clearInterval(id);
      window.removeEventListener("storage", aoMudar);
    };
  }, []);

  // Uma consulta que falhou conta como "chegou" (sem aquele sinal): o pet não fica esperando.
  const chegou = (q: { data?: unknown; isError: boolean }) => q.data !== undefined || q.isError;
  const pronto = Boolean(perfil && agora && chegou(tarefas) && chegou(dias) && chegou(notas));
  const sinais = useMemo(() => {
    if (!perfil || !agora) return SINAIS_VAZIOS;
    return montarSinais({
      tarefas: tarefas.data ?? [],
      dias: dias.data ?? [],
      metaMin: perfil.daily_goal_min,
      notas: notas.data ?? [],
      timer,
      ultimaVisita,
      agora,
      fuso: perfil.timezone,
    });
  }, [perfil, agora, tarefas.data, dias.data, notas.data, timer, ultimaVisita]);

  return { sinais, pronto };
}
