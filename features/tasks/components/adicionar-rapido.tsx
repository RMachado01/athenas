"use client";

import { useId, useMemo, useRef, useState, type FormEvent } from "react";
import { toast } from "sonner";
import { useHoje } from "@/lib/perfil";
import { formatarDuracao } from "@/lib/duracao";
import { acharTrilhaPorNome } from "@/features/tracks/pacotes";
import { useTrilhas } from "@/features/tracks/queries";
import { formatarPrazo } from "../datas";
import { useCriarTarefa } from "../mutations";
import { interpretarTarefaRapida } from "../quick-add";

const ROTULO_DE_PRIORIDADE = { 1: "baixa", 2: "média", 3: "alta" } as const;

/**
 * "Adicionar rápido": uma frase vira tarefa ("5 exercícios de CTE amanhã 19h #sql !alta").
 * Enquanto a pessoa digita, mostramos como o app ENTENDEU a frase (prévia), para ela corrigir
 * antes de enviar. Se o #trilha não existir, a tarefa é criada sem trilha e avisamos.
 */
export function AdicionarRapido() {
  const idDoCampo = useId();
  const idDoErro = useId();
  const campo = useRef<HTMLInputElement>(null);
  const [texto, setTexto] = useState("");
  const [erro, setErro] = useState<string | null>(null);

  const hoje = useHoje();
  const { data: trilhas = [] } = useTrilhas();
  const criar = useCriarTarefa();

  const analise = useMemo(() => interpretarTarefaRapida(texto, hoje), [texto, hoje]);
  const trilhaEncontrada = analise.trilha ? acharTrilhaPorNome(trilhas, analise.trilha) : undefined;
  const trilhaNaoExiste = Boolean(analise.trilha) && !trilhaEncontrada;

  // Prévia do que foi entendido (só mostra o que existe).
  const entendido: string[] = [];
  const prazo = formatarPrazo(analise.prazo, analise.hora, hoje);
  if (prazo) entendido.push(prazo);
  if (trilhaEncontrada) entendido.push(`trilha ${trilhaEncontrada.name}`);
  if (analise.prioridade) entendido.push(`prioridade ${ROTULO_DE_PRIORIDADE[analise.prioridade]}`);
  if (analise.estimativaMin) entendido.push(formatarDuracao(analise.estimativaMin));

  function enviar(evento: FormEvent) {
    evento.preventDefault();
    if (!analise.titulo) {
      setErro("Escreva o título da tarefa.");
      campo.current?.focus();
      return;
    }
    setErro(null);

    criar.mutate({
      id: crypto.randomUUID(),
      title: analise.titulo,
      due_on: analise.prazo,
      due_time: analise.hora,
      priority: analise.prioridade ?? 2,
      estimate_min: analise.estimativaMin,
      track_id: trilhaEncontrada?.id ?? null,
    });

    if (trilhaNaoExiste) {
      toast(`Não achei a trilha “${analise.trilha}”. A tarefa foi criada sem trilha.`);
    }
    setTexto("");
    campo.current?.focus();
  }

  return (
    <form onSubmit={enviar} className="flex flex-col gap-1.5" noValidate>
      <label htmlFor={idDoCampo} className="text-label text-ink-muted uppercase">
        Adicionar rápido
      </label>
      <div className="flex flex-wrap gap-3">
        <input
          ref={campo}
          id={idDoCampo}
          value={texto}
          onChange={(e) => {
            setTexto(e.target.value);
            if (erro) setErro(null);
          }}
          placeholder="Ex.: 5 exercícios de CTE amanhã 19h #sql !alta"
          autoComplete="off"
          aria-invalid={erro ? true : undefined}
          aria-describedby={erro ? idDoErro : undefined}
          className="bg-surface text-ink placeholder:text-ink-muted min-h-12 flex-[1_1_320px] rounded-[10px] border border-border-strong px-4 py-3 outline-none focus-visible:border-accent focus-visible:ring-[3px] focus-visible:ring-brand-soft aria-[invalid=true]:border-danger"
        />
        <button
          type="submit"
          className="bg-accent text-on-accent hover:bg-accent-hover min-h-12 cursor-pointer rounded-[10px] px-5 font-semibold transition-[background-color,transform] duration-(--duration-instant) ease-out active:scale-[0.98]"
        >
          Adicionar
        </button>
      </div>

      {erro ? (
        <p id={idDoErro} role="alert" className="text-danger text-body-sm">
          {erro}
        </p>
      ) : (
        <p className="text-ink-muted text-body-sm" aria-live="polite">
          {entendido.length > 0 ? (
            <>
              <span className="text-ink">Entendi:</span> {entendido.join(" · ")}
              {trilhaNaoExiste && (
                <span className="text-warning"> · trilha “{analise.trilha}” não existe</span>
              )}
            </>
          ) : trilhaNaoExiste ? (
            <span className="text-warning">Trilha “{analise.trilha}” não existe.</span>
          ) : (
            "Entende data, hora, #trilha, !prioridade e ~tempo em linguagem natural."
          )}
        </p>
      )}
    </form>
  );
}
