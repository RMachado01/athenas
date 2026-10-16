"use client";

import { ArchiveRestore, Trash2 } from "lucide-react";
import { useState } from "react";
import { ConfirmarExclusao } from "./confirmar-exclusao";
import { FolhaInferior } from "./folha-inferior";

export interface ItemArquivado {
  id: string;
  titulo: string;
  /** Linha de apoio (ex.: "Arquivado em 14 de out."). */
  detalhe?: string;
}

/**
 * Folha "Arquivados": o que a pessoa arquivou (murais, notas…) com duas saídas: Restaurar
 * (volta para a lista) ou Excluir de vez (com confirmação, não dá para desfazer).
 * Sem isso, arquivar seria um "sumiço": só o "Desfazer" de 6 segundos traria o item de volta.
 */
export function FolhaDeArquivados({
  aberta,
  aoMudar,
  titulo,
  tipo,
  itens,
  aoRestaurar,
  aoExcluir,
}: {
  aberta: boolean;
  aoMudar: (aberta: boolean) => void;
  titulo: string;
  /** "mural" ou "nota": entra nos textos ("Restaurar mural X"). */
  tipo: string;
  itens: readonly ItemArquivado[];
  aoRestaurar: (item: ItemArquivado) => void;
  aoExcluir: (item: ItemArquivado) => void;
}) {
  const [paraExcluir, setParaExcluir] = useState<ItemArquivado | null>(null);

  return (
    <>
      <FolhaInferior aberta={aberta} aoMudar={aoMudar} titulo={titulo}>
        {itens.length === 0 ? (
          <p className="text-ink-muted">Nada arquivado.</p>
        ) : (
          <ul role="list" className="flex flex-col gap-2">
            {itens.map((item) => (
              <li
                key={item.id}
                className="cartao flex items-center gap-1 rounded-lg py-1 pr-1 pl-4"
              >
                <span className="flex min-w-0 flex-1 flex-col py-2">
                  <span className="truncate font-semibold">{item.titulo}</span>
                  {item.detalhe && (
                    <span className="text-ink-muted text-body-sm truncate">{item.detalhe}</span>
                  )}
                </span>
                <button
                  type="button"
                  onClick={() => aoRestaurar(item)}
                  aria-label={`Restaurar ${tipo} ${item.titulo}`}
                  className="hover:text-accent grid size-11 shrink-0 cursor-pointer place-items-center rounded-full"
                >
                  <ArchiveRestore className="size-5" aria-hidden />
                </button>
                <button
                  type="button"
                  onClick={() => setParaExcluir(item)}
                  aria-label={`Excluir ${tipo} ${item.titulo}`}
                  className="text-danger grid size-11 shrink-0 cursor-pointer place-items-center rounded-full"
                >
                  <Trash2 className="size-5" aria-hidden />
                </button>
              </li>
            ))}
          </ul>
        )}
      </FolhaInferior>

      <ConfirmarExclusao
        aberto={paraExcluir !== null}
        aoMudar={(aberto) => !aberto && setParaExcluir(null)}
        titulo={`Excluir ${tipo} de vez?`}
        descricao={`“${paraExcluir?.titulo ?? ""}” será ${tipo === "nota" ? "apagada" : "apagado"} para sempre.`}
        aoConfirmar={() => {
          if (paraExcluir) aoExcluir(paraExcluir);
          setParaExcluir(null);
        }}
      />
    </>
  );
}
