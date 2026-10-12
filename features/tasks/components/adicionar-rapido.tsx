"use client";

import { Plus } from "lucide-react";
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

/** Atalhos que inserem um pedaço da frase (referência: chips de ação abaixo do campo de mensagem). */
const ATALHOS = ["hoje", "amanhã", "!alta", "#"] as const;

/**
 * "Adicionar rápido": uma frase vira tarefa ("5 exercícios de CTE amanhã 19h #sql !alta").
 * Campo em pílula com o botão "+" dentro (como nas referências). Enquanto a pessoa digita,
 * mostramos como o app ENTENDEU a frase (prévia), para ela corrigir antes de enviar.
 * Se o #trilha não existir, a tarefa é criada sem trilha e avisamos.
 *
 * `aoEnviar` avisa quem usa (ex.: a folha do botão "+", que fecha ao criar).
 */
export function AdicionarRapido({
  autoFoco = false,
  aoEnviar,
}: {
  autoFoco?: boolean;
  aoEnviar?: () => void;
}) {
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

  function inserir(pedaco: string) {
    setTexto(
      (atual) =>
        `${atual}${atual && !atual.endsWith(" ") ? " " : ""}${pedaco}${pedaco === "#" ? "" : " "}`,
    );
    setErro(null);
    campo.current?.focus();
  }

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
    aoEnviar?.();
  }

  return (
    <form onSubmit={enviar} className="flex flex-col gap-3" noValidate>
      <label htmlFor={idDoCampo} className="sr-only">
        Adicionar rápido
      </label>

      <div className="campo rounded-pill flex min-h-14 items-center gap-2 pr-1.5 pl-5">
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
          autoFocus={autoFoco}
          enterKeyHint="done"
          aria-invalid={erro ? true : undefined}
          aria-describedby={erro ? idDoErro : undefined}
          className="text-ink placeholder:text-ink-muted min-h-11 min-w-0 flex-1 bg-transparent text-[16px] outline-none"
        />
        <button
          type="submit"
          aria-label="Adicionar"
          className="botao-primario grid size-11 shrink-0 cursor-pointer place-items-center"
        >
          <Plus className="size-5" strokeWidth={2.5} aria-hidden />
        </button>
      </div>

      {/* Atalhos rolam na horizontal (como os chips das referências). */}
      <div
        className="-mx-5 flex gap-2 overflow-x-auto px-5 pb-0.5"
        role="group"
        aria-label="Atalhos"
      >
        {ATALHOS.map((a) => (
          <button
            key={a}
            type="button"
            onClick={() => inserir(a)}
            className="botao-vidro text-body-sm min-h-9 shrink-0 cursor-pointer px-4 font-semibold"
          >
            {a === "#" ? "# trilha" : a}
          </button>
        ))}
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
            "Escreva do seu jeito: o app entende data, hora, #trilha, !prioridade e ~tempo."
          )}
        </p>
      )}
    </form>
  );
}
