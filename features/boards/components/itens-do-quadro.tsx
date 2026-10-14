"use client";

import { Handle, NodeResizer, Position, type NodeProps } from "@xyflow/react";
import { Check, Circle, Pencil } from "lucide-react";
import { useAlternarConclusao } from "@/features/tasks/mutations";
import { useTarefas } from "@/features/tasks/queries";
import { varDaCor } from "../cores";
import type { NodeDoMural } from "../conversao";
import { encaixar, limitarTamanho } from "../geometria";
import { useQuadro } from "./contexto";

/**
 * Os 4 tipos de item do quadro. Cada um:
 *  - mostra alças de redimensionar quando selecionado (salva ao soltar, respeitando o mínimo);
 *  - tem "pontos de ligação" (Handle) para criar setas arrastando no computador;
 *  - no modo "Ligar", ganha destaque quando é a origem escolhida.
 */

function Alcas({ node }: { node: NodeProps<NodeDoMural> }) {
  const { atualizarItem } = useQuadro();
  const item = node.data.item;
  const min = limitarTamanho(item.tipo, 0, 0);
  return (
    <NodeResizer
      isVisible={node.selected}
      minWidth={min.w}
      minHeight={min.h}
      lineClassName="!border-[var(--accent)]"
      handleClassName="!size-3 !rounded-full !border-2 !border-[var(--accent)] !bg-[var(--bg)]"
      onResizeEnd={(_e, p) => {
        const t = limitarTamanho(item.tipo, p.width, p.height);
        atualizarItem(item.id, { x: encaixar(p.x), y: encaixar(p.y), w: t.w, h: t.h });
      }}
    />
  );
}

/** Pontos de ligação discretos (aparecem no hover/seleção, como no Obsidian Canvas). */
function Pontos() {
  const classe =
    "!size-2.5 !border-0 !bg-[var(--accent)] opacity-0 transition-opacity group-hover/item:opacity-100 group-[.selected]/item:opacity-100";
  return (
    <>
      <Handle type="target" position={Position.Top} className={classe} />
      <Handle type="source" position={Position.Bottom} className={classe} />
    </>
  );
}

function useDestaqueDeLigacao(id: string) {
  const { modoLigar, origemDaLigacao } = useQuadro();
  if (!modoLigar) return "";
  return origemDaLigacao === id
    ? "ring-4 ring-[var(--accent)]"
    : "ring-2 ring-dashed ring-[color-mix(in_srgb,var(--accent)_50%,transparent)]";
}

/** Fundo do post-it: a cor misturada à superfície do tema (opaca: o texto mantém contraste). */
function fundoDaCor(cor: Parameters<typeof varDaCor>[0], forca = 34) {
  return `color-mix(in srgb, ${varDaCor(cor)} ${forca}%, var(--surface))`;
}

export function NotaNode(node: NodeProps<NodeDoMural>) {
  const { abrirEdicao } = useQuadro();
  const item = node.data.item;
  const destaque = useDestaqueDeLigacao(item.id);
  return (
    <div
      className={`group/item ${node.selected ? "selected" : ""} relative size-full`}
      onDoubleClick={() => abrirEdicao(item.id)}
    >
      <Alcas node={node} />
      <Pontos />
      <article
        aria-label={`Post-it: ${item.texto || "vazio"}`}
        className={`size-full overflow-hidden rounded-[6px] p-3.5 shadow-[0_10px_24px_-14px_rgb(0_0_0/0.6),0_1px_0_rgb(255_255_255/0.08)_inset] ${destaque}`}
        style={{ background: fundoDaCor(item.cor), color: "var(--ink)" }}
      >
        <p className="text-[15px] leading-snug break-words whitespace-pre-wrap">
          {item.texto || <span className="text-ink-muted">Toque em Editar para escrever</span>}
        </p>
      </article>
    </div>
  );
}

export function TituloNode(node: NodeProps<NodeDoMural>) {
  const { abrirEdicao } = useQuadro();
  const item = node.data.item;
  const destaque = useDestaqueDeLigacao(item.id);
  return (
    <div
      className={`group/item ${node.selected ? "selected" : ""} relative size-full`}
      onDoubleClick={() => abrirEdicao(item.id)}
    >
      <Alcas node={node} />
      <Pontos />
      <h3
        className={`font-display flex size-full items-center overflow-hidden rounded-md px-1 text-[28px] leading-tight font-bold tracking-tight ${destaque}`}
      >
        <span className="truncate">{item.texto || "Título"}</span>
      </h3>
    </div>
  );
}

export function GrupoNode(node: NodeProps<NodeDoMural>) {
  const { abrirEdicao } = useQuadro();
  const item = node.data.item;
  const destaque = useDestaqueDeLigacao(item.id);
  return (
    <div className={`group/item ${node.selected ? "selected" : ""} relative size-full`}>
      <Alcas node={node} />
      <Pontos />
      <section
        aria-label={`Grupo: ${item.texto || "sem nome"}`}
        className={`size-full rounded-xl border-2 ${destaque}`}
        style={{
          borderColor: `color-mix(in srgb, ${varDaCor(item.cor)} 70%, transparent)`,
          background: `color-mix(in srgb, ${varDaCor(item.cor)} 8%, transparent)`,
        }}
      >
        <button
          type="button"
          onClick={() => abrirEdicao(item.id)}
          className="text-body-sm m-2 flex min-h-11 max-w-[calc(100%-1rem)] cursor-pointer items-center gap-1.5 rounded-md px-2.5 font-semibold"
          style={{ background: fundoDaCor(item.cor, 40) }}
        >
          <span className="truncate">{item.texto || "Grupo"}</span>
          <Pencil className="size-3 shrink-0 opacity-60" aria-hidden />
        </button>
      </section>
    </div>
  );
}

export function TarefaNode(node: NodeProps<NodeDoMural>) {
  const item = node.data.item;
  const { data: tarefas = [] } = useTarefas();
  const alternar = useAlternarConclusao();
  const destaque = useDestaqueDeLigacao(item.id);
  const tarefa = item.tarefaId ? tarefas.find((t) => t.id === item.tarefaId) : undefined;
  const feita = tarefa?.status === "done";

  return (
    <div className={`group/item ${node.selected ? "selected" : ""} relative size-full`}>
      <Alcas node={node} />
      <Pontos />
      <article
        aria-label={`Tarefa: ${tarefa?.title ?? "tarefa removida"}`}
        className={`cartao flex size-full items-center gap-3 overflow-hidden rounded-lg px-3 ${destaque}`}
        style={{ boxShadow: `inset 3px 0 0 ${varDaCor(item.cor)}` }}
      >
        {tarefa ? (
          <>
            <button
              type="button"
              onClick={() => alternar(tarefa)}
              aria-label={feita ? `Reabrir ${tarefa.title}` : `Concluir ${tarefa.title}`}
              aria-pressed={feita}
              className={`nodrag grid size-11 shrink-0 cursor-pointer place-items-center rounded-full`}
            >
              <span
                className={`grid size-6 place-items-center rounded-full border-2 ${
                  feita
                    ? "bg-accent text-on-accent border-transparent"
                    : "border-[var(--ink-muted)]"
                }`}
              >
                {feita && <Check className="size-4" strokeWidth={3} aria-hidden />}
              </span>
            </button>
            <span
              className={`min-w-0 flex-1 truncate font-semibold ${feita ? "text-ink-muted line-through" : ""}`}
            >
              {tarefa.title}
            </span>
          </>
        ) : (
          <span className="text-ink-muted text-body-sm flex items-center gap-2">
            <Circle className="size-4" aria-hidden />
            Tarefa removida
          </span>
        )}
      </article>
    </div>
  );
}

export const TIPOS_DE_NODE = {
  nota: NotaNode,
  titulo: TituloNode,
  grupo: GrupoNode,
  tarefa: TarefaNode,
};
