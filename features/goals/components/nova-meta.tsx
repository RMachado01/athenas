"use client";

import { useId, useState, type FormEvent } from "react";
import { Seletor } from "@/components/ui/seletor";
import { useTrilhas } from "@/features/tracks/queries";
import { useCriarMeta } from "../queries";
import {
  PERIODOS_DE_META,
  TIPOS_DE_META,
  tituloSugerido,
  validarMeta,
  type ErrosDaMeta,
  type PeriodoDeMeta,
  type TipoDeMeta,
} from "../regras";

/**
 * Formulário de nova meta (vive dentro de uma folha inferior). Escolhas em pílulas
 * (tipo e período), o alvo num campo grande e, opcional, nome e trilha. Erros aparecem
 * ao lado do campo. `aoCriar` avisa quem abriu a folha para fechá-la.
 */
export function NovaMeta({ aoCriar }: { aoCriar: () => void }) {
  const { data: trilhas = [] } = useTrilhas();
  const criar = useCriarMeta();
  const [tipo, setTipo] = useState<TipoDeMeta>("minutos");
  const [periodo, setPeriodo] = useState<PeriodoDeMeta>("semana");
  const [alvo, setAlvo] = useState("");
  const [titulo, setTitulo] = useState("");
  const [trilhaId, setTrilhaId] = useState<string | null>(null);
  const [erros, setErros] = useState<ErrosDaMeta>({});
  const ids = { alvo: useId(), erroAlvo: useId(), titulo: useId() };

  function enviar(e: FormEvent) {
    e.preventDefault();
    const r = validarMeta({ titulo, tipo, periodo, alvo, trilhaId });
    if (!r.ok) {
      setErros(r.erros);
      document.getElementById(ids.alvo)?.focus();
      return;
    }
    criar.mutate({ ...r.meta, id: crypto.randomUUID() });
    aoCriar();
  }

  const rotuloDoAlvo =
    (tipo === "minutos" ? "Horas de foco " : "Tarefas concluídas ") +
    (periodo === "semana" ? "por semana" : "por mês");

  return (
    <form onSubmit={enviar} noValidate className="flex flex-col gap-5">
      <Pilulas
        rotulo="Tipo de meta"
        opcoes={TIPOS_DE_META}
        valor={tipo}
        aoMudar={(v) => {
          setTipo(v);
          setErros({});
        }}
      />
      <Pilulas rotulo="Período" opcoes={PERIODOS_DE_META} valor={periodo} aoMudar={setPeriodo} />

      <div className="flex flex-col gap-2">
        <label htmlFor={ids.alvo} className="text-ink-muted text-body-sm font-medium">
          {rotuloDoAlvo}
        </label>
        <input
          id={ids.alvo}
          inputMode="decimal"
          autoComplete="off"
          value={alvo}
          onChange={(e) => {
            setAlvo(e.target.value);
            if (erros.alvo) setErros({});
          }}
          placeholder={tipo === "minutos" ? "Ex.: 5" : "Ex.: 20"}
          aria-invalid={erros.alvo ? true : undefined}
          aria-describedby={erros.alvo ? ids.erroAlvo : undefined}
          className="campo rounded-pill text-heading-2 min-h-14 w-full bg-transparent px-5 tabular-nums outline-none"
        />
        {erros.alvo && (
          <p id={ids.erroAlvo} role="alert" className="text-danger text-body-sm">
            {erros.alvo}
          </p>
        )}
      </div>

      <div className="flex flex-col gap-2">
        <label htmlFor={ids.titulo} className="text-ink-muted text-body-sm font-medium">
          Nome (opcional)
        </label>
        <input
          id={ids.titulo}
          value={titulo}
          maxLength={80}
          onChange={(e) => setTitulo(e.target.value)}
          placeholder={tituloSugerido(tipo, periodo, alvo)}
          className="campo rounded-pill min-h-12 w-full bg-transparent px-5 text-[16px] outline-none"
        />
      </div>

      {trilhas.length > 0 && (
        <Seletor
          rotulo="Trilha (opcional)"
          opcoes={[
            { valor: "", rotulo: "Todas as trilhas" },
            ...trilhas.map((t) => ({ valor: t.id, rotulo: t.name })),
          ]}
          valor={trilhaId ?? ""}
          aoMudar={(v) => setTrilhaId(v || null)}
        />
      )}

      <button type="submit" className="botao-primario min-h-14 cursor-pointer font-semibold">
        Criar meta
      </button>
    </form>
  );
}

function Pilulas<T extends string>({
  rotulo,
  opcoes,
  valor,
  aoMudar,
}: {
  rotulo: string;
  opcoes: readonly { id: T; rotulo: string }[];
  valor: T;
  aoMudar: (v: T) => void;
}) {
  return (
    <div role="radiogroup" aria-label={rotulo} className="vidro rounded-pill flex gap-1 p-1">
      {opcoes.map((o) => {
        const marcado = o.id === valor;
        return (
          <button
            key={o.id}
            type="button"
            role="radio"
            aria-checked={marcado}
            onClick={() => aoMudar(o.id)}
            className={`rounded-pill min-h-11 flex-1 cursor-pointer px-3 font-semibold ${
              marcado ? "bg-accent text-on-accent" : "text-ink-muted hover:text-ink"
            }`}
          >
            {o.rotulo}
          </button>
        );
      })}
    </div>
  );
}
