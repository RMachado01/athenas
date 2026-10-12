"use client";

import { Check, Trash2 } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";
import { FolhaInferior } from "@/components/ui/folha-inferior";
import { CORES_DO_MURAL, varDaCor } from "../cores";
import type { ItemDoMural } from "../queries";

const LIMITE: Record<ItemDoMural["tipo"], number> = {
  nota: 2000,
  titulo: 120,
  grupo: 80,
  tarefa: 0,
};
const NOME: Record<ItemDoMural["tipo"], string> = {
  nota: "Editar post-it",
  titulo: "Editar título",
  grupo: "Editar grupo",
  tarefa: "Card de tarefa",
};

/**
 * Folha de edição de um item: texto (salva 500 ms depois de parar de digitar), cor e apagar.
 * Cartões de tarefa só trocam a cor (o texto é o da própria tarefa).
 */
export function EdicaoDeItem({
  item,
  aoFechar,
  aoMudar,
  aoApagar,
}: {
  item: ItemDoMural | null;
  aoFechar: () => void;
  aoMudar: (mudanca: Partial<ItemDoMural>) => void;
  aoApagar: () => void;
}) {
  return (
    <FolhaInferior
      aberta={item !== null}
      aoMudar={(aberta) => !aberta && aoFechar()}
      titulo={item ? NOME[item.tipo] : "Editar"}
    >
      {item && <Conteudo key={item.id} item={item} aoMudar={aoMudar} aoApagar={aoApagar} />}
    </FolhaInferior>
  );
}

function Conteudo({
  item,
  aoMudar,
  aoApagar,
}: {
  item: ItemDoMural;
  aoMudar: (mudanca: Partial<ItemDoMural>) => void;
  aoApagar: () => void;
}) {
  const idTexto = useId();
  const [texto, setTexto] = useState(item.texto);
  const espera = useRef<number | null>(null);
  const pendente = useRef<string | null>(null);

  // Salva o texto com espera; e salva o que faltar ao fechar a folha.
  useEffect(
    () => () => {
      if (espera.current) window.clearTimeout(espera.current);
      if (pendente.current !== null) aoMudar({ texto: pendente.current });
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps -- só ao desmontar
    [],
  );

  function digitar(valor: string) {
    const limitado = valor.slice(0, LIMITE[item.tipo]);
    setTexto(limitado);
    pendente.current = limitado;
    if (espera.current) window.clearTimeout(espera.current);
    espera.current = window.setTimeout(() => {
      aoMudar({ texto: limitado });
      pendente.current = null;
    }, 500);
  }

  return (
    <div className="flex flex-col gap-5 pb-2">
      {item.tipo !== "tarefa" && (
        <div className="flex flex-col gap-2">
          <label htmlFor={idTexto} className="text-ink-muted text-body-sm font-medium">
            {item.tipo === "nota" ? "Texto" : "Nome"}
          </label>
          {item.tipo === "nota" ? (
            <textarea
              id={idTexto}
              value={texto}
              onChange={(e) => digitar(e.target.value)}
              rows={6}
              autoFocus
              className="campo min-h-36 w-full resize-none rounded-xl bg-transparent p-4 text-[16px] leading-snug outline-none"
            />
          ) : (
            <input
              id={idTexto}
              value={texto}
              onChange={(e) => digitar(e.target.value)}
              autoFocus
              className="campo rounded-pill min-h-12 w-full bg-transparent px-5 text-[16px] outline-none"
            />
          )}
          <span className="text-ink-muted text-body-sm self-end tabular-nums">
            {texto.length}/{LIMITE[item.tipo]}
          </span>
        </div>
      )}

      {item.tipo !== "titulo" && (
        <fieldset className="flex flex-col gap-2">
          <legend className="text-ink-muted text-body-sm mb-2 font-medium">Cor</legend>
          <div role="radiogroup" aria-label="Cor" className="flex flex-wrap gap-2.5">
            {CORES_DO_MURAL.map((c) => (
              <button
                key={c.id}
                type="button"
                role="radio"
                aria-checked={item.cor === c.id}
                aria-label={c.nome}
                onClick={() => aoMudar({ cor: c.id })}
                className={`grid size-11 cursor-pointer place-items-center rounded-full ${
                  item.cor === c.id
                    ? "ring-accent ring-2 ring-offset-2 ring-offset-[var(--bg)]"
                    : ""
                }`}
                style={{ background: varDaCor(c.id) }}
              >
                {item.cor === c.id && <Check className="size-5 text-black/70" aria-hidden />}
              </button>
            ))}
          </div>
        </fieldset>
      )}

      <button
        type="button"
        onClick={aoApagar}
        className="text-danger flex min-h-11 cursor-pointer items-center gap-2 self-start font-semibold"
      >
        <Trash2 className="size-4" aria-hidden />
        Apagar do mural
      </button>
    </div>
  );
}
