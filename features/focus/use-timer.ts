"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { usePerfil } from "@/lib/perfil";
import { useRegistrarSessao } from "./queries";
import {
  CONFIG_PADRAO,
  decorrido,
  intervaloParaGravar,
  iniciar,
  lerEstado,
  pausar,
  proximaFase,
  restante,
  retomar,
  terminou,
  valeGravar,
  type ConfigPomodoro,
  type EstadoDoTimer,
} from "./timer";

const CHAVE = "athenas-foco";

function carregar(): EstadoDoTimer | null {
  try {
    const bruto = window.localStorage.getItem(CHAVE);
    return bruto ? lerEstado(JSON.parse(bruto)) : null;
  } catch {
    return null;
  }
}

function guardar(e: EstadoDoTimer | null) {
  try {
    if (e) window.localStorage.setItem(CHAVE, JSON.stringify(e));
    else window.localStorage.removeItem(CHAVE);
  } catch {
    /* sem armazenamento (aba privada): o cronômetro ainda funciona, só não sobrevive ao recarregar */
  }
}

/**
 * Cronômetro de foco. O estado são INSTANTES (não "segundos que faltam"), guardados no
 * localStorage: dá para recarregar a página ou bloquear o celular e a conta continua certa.
 * Ao acabar uma fase de foco, a sessão é gravada no banco e a próxima fase fica pronta (pausada).
 */
export function useTimerDeFoco(trackDaTarefa: (taskId: string | null) => string | null) {
  const { data: perfil } = usePerfil();
  const registrar = useRegistrarSessao();

  const cfg: ConfigPomodoro = useMemo(
    () =>
      perfil
        ? {
            focoMin: perfil.pomodoro_focus_min,
            pausaMin: perfil.pomodoro_break_min,
            pausaLongaMin: perfil.pomodoro_long_break_min,
            cicloDe: perfil.pomodoro_cycle_length,
          }
        : CONFIG_PADRAO,
    [perfil],
  );

  const [estado, setEstado] = useState<EstadoDoTimer | null>(null);
  const [pronto, setPronto] = useState(false);
  const [agora, setAgora] = useState(() => Date.now());
  const [taskId, setTaskId] = useState<string | null>(null);
  // Evita gravar a mesma sessão duas vezes se o relógio "bater zero" em dois ticks seguidos.
  const encerrando = useRef(false);

  // Lê o que estava guardado (só no navegador, depois da hidratação).
  useEffect(() => {
    const salvo = carregar();
    // eslint-disable-next-line react-hooks/set-state-in-effect -- sincroniza com o localStorage uma vez
    setEstado(salvo);
    if (salvo?.fase === "foco") setTaskId(salvo.taskId);
    setPronto(true);
  }, []);

  const trocar = useCallback((novo: EstadoDoTimer | null) => {
    setEstado(novo);
    guardar(novo);
  }, []);

  // Relógio: bate a cada 250 ms só enquanto está rodando.
  const rodando = estado?.retomadoEm != null;
  useEffect(() => {
    if (!rodando) return;
    const id = window.setInterval(() => setAgora(Date.now()), 250);
    return () => window.clearInterval(id);
  }, [rodando]);

  /** Encerra a fase atual (gravando o foco, se valer) e deixa a próxima pronta e pausada. */
  const encerrar = useCallback(
    (e: EstadoDoTimer, instante: number, avisar: boolean) => {
      if (encerrando.current) return;
      encerrando.current = true;
      if (valeGravar(e, instante)) {
        const { inicio, fim, minutosPlanejados } = intervaloParaGravar(e, instante);
        registrar.mutate({
          inicio,
          fim,
          minutosPlanejados,
          taskId: e.taskId,
          trackId: trackDaTarefa(e.taskId),
        });
      }
      const prox = proximaFase(e, cfg);
      const proximo = pausar(
        iniciar(prox.fase, cfg, instante, { ciclo: prox.ciclo, taskId: e.taskId }),
        instante,
      );
      trocar(proximo);
      if (avisar) {
        toast.success(
          e.fase === "foco" ? "Foco concluído. Hora da pausa!" : "Pausa terminou. Bora voltar?",
        );
        if ("vibrate" in navigator) navigator.vibrate?.([200, 100, 200]);
      }
      encerrando.current = false;
    },
    [cfg, registrar, trackDaTarefa, trocar],
  );

  // Chegou a zero: encerra sozinho.
  useEffect(() => {
    if (estado && rodando && terminou(estado, agora)) encerrar(estado, agora, true);
  }, [agora, estado, rodando, encerrar]);

  const iniciarFoco = useCallback(() => {
    const t = Date.now();
    setAgora(t);
    trocar(iniciar("foco", cfg, t, { ciclo: estado?.ciclo ?? 0, taskId }));
  }, [cfg, estado, taskId, trocar]);

  const alternar = useCallback(() => {
    const t = Date.now();
    setAgora(t);
    if (!estado) return iniciarFoco();
    trocar(estado.retomadoEm === null ? retomar(estado, t) : pausar(estado, t));
  }, [estado, iniciarFoco, trocar]);

  /** "Concluir agora": grava o que já foi focado e avança. */
  const concluir = useCallback(() => {
    if (estado) encerrar(estado, Date.now(), false);
  }, [estado, encerrar]);

  /** Descarta a fase atual sem gravar nada. */
  const descartar = useCallback(() => trocar(null), [trocar]);

  const escolherTarefa = useCallback(
    (id: string | null) => {
      setTaskId(id);
      // Trocar a tarefa no meio de um foco vale para a sessão em andamento.
      if (estado?.fase === "foco") trocar({ ...estado, taskId: id });
    },
    [estado, trocar],
  );

  const fase = estado?.fase ?? "foco";
  const duracaoMs = estado?.duracaoMs ?? cfg.focoMin * 60_000;
  const restanteMs = estado ? restante(estado, agora) : duracaoMs;
  const decorridoMs = estado ? decorrido(estado, agora) : 0;

  return {
    pronto,
    cfg,
    fase,
    ciclo: estado?.ciclo ?? 0,
    duracaoMs,
    restanteMs,
    decorridoMs,
    rodando,
    emAndamento: estado !== null,
    taskId,
    escolherTarefa,
    alternar,
    concluir,
    descartar,
  };
}
