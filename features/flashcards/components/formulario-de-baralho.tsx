"use client";

import { RadioGroup } from "radix-ui";
import { useId, useState, type FormEvent } from "react";
import { CORES_DO_MURAL, varDaCor, type CorDoMural } from "@/features/boards/cores";
import { useTrilhas } from "@/features/tracks/queries";
import { chaveDoTitulo } from "@/features/notes/documento";
import { useBaralhos, useCriarBaralho, useEditarBaralho, type Baralho } from "../queries";

export function FormularioDeBaralho({
  baralho,
  aoTerminar,
}: {
  baralho?: Baralho;
  aoTerminar: (id: string) => void;
}) {
  const { data: baralhos = [] } = useBaralhos();
  const { data: trilhas = [] } = useTrilhas();
  const criar = useCriarBaralho();
  const editar = useEditarBaralho();
  const [nome, setNome] = useState(baralho?.nome ?? "");
  const [cor, setCor] = useState<CorDoMural>(baralho?.cor ?? "azul");
  const [trilhaId, setTrilhaId] = useState<string | null>(baralho?.trilhaId ?? null);
  const [erro, setErro] = useState<string | null>(null);
  const ids = { nome: useId(), erro: useId(), trilha: useId(), cor: useId() };

  async function enviar(e: FormEvent) {
    e.preventDefault();
    const n = nome.trim();
    if (!n) return setErro("Dê um nome ao baralho.");
    if (baralhos.some((b) => b.id !== baralho?.id && chaveDoTitulo(b.nome) === chaveDoTitulo(n)))
      return setErro("Já existe um baralho com esse nome.");
    const id = baralho?.id ?? crypto.randomUUID();
    try {
      if (baralho) await editar.mutateAsync({ id, nome: n, cor, trilhaId });
      else await criar.mutateAsync({ id, nome: n, cor, trilhaId });
      aoTerminar(id);
    } catch {
      /* o aviso já foi mostrado pela mutação */
    }
  }

  return (
    <form onSubmit={enviar} noValidate className="flex flex-col gap-4">
      <label htmlFor={ids.nome} className="text-ink-muted text-body-sm font-medium">
        Nome
      </label>
      <input
        id={ids.nome}
        value={nome}
        maxLength={80}
        autoFocus
        autoComplete="off"
        onChange={(e) => {
          setNome(e.target.value);
          if (erro) setErro(null);
        }}
        placeholder="Ex.: Anatomia, Direito Constitucional, SQL"
        aria-invalid={erro ? true : undefined}
        aria-describedby={erro ? ids.erro : undefined}
        className="campo rounded-pill min-h-12 w-full bg-transparent px-5 text-[16px] outline-none"
      />
      {erro && (
        <p id={ids.erro} role="alert" className="text-danger text-body-sm">
          {erro}
        </p>
      )}

      <span id={ids.cor} className="text-ink-muted text-body-sm font-medium">
        Cor
      </span>
      <RadioGroup.Root
        aria-labelledby={ids.cor}
        value={cor}
        onValueChange={(v) => setCor(v as CorDoMural)}
        className="flex flex-wrap gap-2"
      >
        {CORES_DO_MURAL.map((c) => (
          <RadioGroup.Item
            key={c.id}
            value={c.id}
            aria-label={c.nome}
            className="grid size-11 cursor-pointer place-items-center rounded-full border-2 border-transparent data-[state=checked]:border-[var(--ink)]"
          >
            <span
              className="size-7 rounded-full"
              style={{ background: varDaCor(c.id) }}
              aria-hidden
            />
          </RadioGroup.Item>
        ))}
      </RadioGroup.Root>

      <label htmlFor={ids.trilha} className="text-ink-muted text-body-sm font-medium">
        Trilha (opcional)
      </label>
      <select
        id={ids.trilha}
        value={trilhaId ?? ""}
        onChange={(e) => setTrilhaId(e.target.value || null)}
        className="campo rounded-pill min-h-12 w-full bg-transparent px-5 text-[16px]"
      >
        <option value="">Nenhuma</option>
        {trilhas.map((t) => (
          <option key={t.id} value={t.id}>
            {t.name}
          </option>
        ))}
      </select>

      <button type="submit" className="botao-primario min-h-14 cursor-pointer font-semibold">
        {baralho ? "Salvar" : "Criar baralho"}
      </button>
    </form>
  );
}
