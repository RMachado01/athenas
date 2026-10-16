"use client";

import { Check, Plus } from "lucide-react";
import { RadioGroup } from "radix-ui";
import { useId, useState, type FormEvent } from "react";
import { CORES_DO_MURAL, varDaCor, type CorDoMural } from "@/features/boards/cores";
import { useCriarTrilha, useEditarTrilha, useTrilhas, type Trilha } from "../queries";

/**
 * Conteúdo da folha "Trilhas": criar trilha, renomear e escolher a cor. A cor da trilha é a
 * "etiqueta" do app inteiro: colunas do Quadro, barras do calendário e post-its do Mural.
 */
export function GerenciarTrilhas() {
  const { data: trilhas = [] } = useTrilhas();
  const criar = useCriarTrilha();
  const [nome, setNome] = useState("");
  const idDoCampo = useId();

  function enviar(e: FormEvent) {
    e.preventDefault();
    const limpo = nome.trim();
    if (!limpo) return;
    criar.mutate({
      id: crypto.randomUUID(),
      name: limpo,
      // A cor seguinte da paleta: cada trilha nova nasce diferente da anterior.
      color: CORES_DO_MURAL[trilhas.length % CORES_DO_MURAL.length]!.id,
      sort_order: trilhas.length,
    });
    setNome("");
  }

  return (
    <div className="flex flex-col gap-5">
      <form onSubmit={enviar} className="flex gap-2">
        <label className="sr-only" htmlFor={idDoCampo}>
          Nome da nova trilha
        </label>
        <input
          id={idDoCampo}
          value={nome}
          maxLength={60}
          autoComplete="off"
          onChange={(e) => setNome(e.target.value)}
          placeholder="Nova trilha (ex.: Python para Dados)"
          className="campo rounded-pill min-h-12 min-w-0 flex-1 bg-transparent px-5 text-[16px] outline-none"
        />
        <button
          type="submit"
          aria-label="Criar trilha"
          disabled={!nome.trim()}
          className="botao-primario grid size-12 shrink-0 cursor-pointer place-items-center disabled:opacity-45"
        >
          <Plus className="size-5" strokeWidth={2.5} aria-hidden />
        </button>
      </form>

      {trilhas.length === 0 ? (
        <p className="text-ink-muted">
          Você ainda não tem trilhas. Uma trilha é um assunto (ex.: SQL, Anatomia, ENEM) que agrupa
          tarefas, notas e cartões.
        </p>
      ) : (
        <ul role="list" className="flex flex-col gap-3">
          {trilhas.map((t) => (
            <li key={t.id}>
              <LinhaDaTrilha trilha={t} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function LinhaDaTrilha({ trilha }: { trilha: Trilha }) {
  const editar = useEditarTrilha();
  const idDoNome = useId();

  return (
    <div className="cartao flex flex-col gap-3 rounded-xl p-4">
      <div className="flex items-center gap-3">
        <span
          aria-hidden="true"
          className="grid size-10 shrink-0 place-items-center rounded-pill font-semibold"
          style={{
            background: `color-mix(in srgb, ${varDaCor(trilha.color)} 45%, var(--surface))`,
          }}
        >
          {trilha.monogram}
        </span>
        <label className="sr-only" htmlFor={idDoNome}>
          Nome da trilha {trilha.name}
        </label>
        <input
          id={idDoNome}
          defaultValue={trilha.name}
          maxLength={60}
          onBlur={(e) => {
            const novo = e.target.value.trim();
            if (!novo) e.target.value = trilha.name;
            else if (novo !== trilha.name) editar.mutate({ id: trilha.id, name: novo });
          }}
          className="focus-visible:decoration-accent min-h-11 min-w-0 flex-1 bg-transparent text-[16px] font-semibold outline-none focus-visible:underline focus-visible:underline-offset-4"
        />
      </div>
      <RadioGroup.Root
        aria-label={`Cor da trilha ${trilha.name}`}
        value={trilha.color}
        onValueChange={(v) => editar.mutate({ id: trilha.id, color: v as CorDoMural })}
        className="flex flex-wrap gap-1"
      >
        {CORES_DO_MURAL.map((c) => (
          <RadioGroup.Item
            key={c.id}
            value={c.id}
            aria-label={c.nome}
            className="grid size-11 cursor-pointer place-items-center rounded-pill"
          >
            <span
              className="grid size-8 place-items-center rounded-pill border-2 border-transparent transition-transform duration-(--duration-instant) data-[checked=true]:scale-110 data-[checked=true]:border-[var(--ink)]"
              data-checked={trilha.color === c.id}
              style={{ background: varDaCor(c.id) }}
            >
              <RadioGroup.Indicator asChild>
                <Check className="size-4 text-[var(--ink)]" strokeWidth={3} aria-hidden />
              </RadioGroup.Indicator>
            </span>
          </RadioGroup.Item>
        ))}
      </RadioGroup.Root>
    </div>
  );
}
