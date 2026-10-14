"use client";

import "@xyflow/react/dist/style.css";
import {
  Background,
  BackgroundVariant,
  Panel,
  ReactFlow,
  ReactFlowProvider,
  useNodesState,
  useReactFlow,
  type Node,
  type NodeProps,
} from "@xyflow/react";
import { Maximize, SquareArrowOutUpRight } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef } from "react";
import { varDaCor, type CorDoMural } from "@/features/boards/cores";
import { encaixar } from "@/features/boards/geometria";
import type { Trilha } from "@/features/tracks/queries";
import { formatarPrazo } from "../datas";
import {
  ALTURA_DO_POSTIT,
  LARGURA_DO_POSTIT,
  posicaoLivre,
  separarTarefas,
  type Ponto,
} from "../mural";
import { usePosicoesDeTarefas, useSalvarPosicao } from "../posicoes";
import type { Tarefa } from "../tipos";

interface DadosDoPostit extends Record<string, unknown> {
  tarefa: Tarefa;
  trilha: Trilha | null;
  prazo: string | null;
  aoAbrir: (id: string) => void;
  aoConcluir: (tarefa: Tarefa) => void;
}
type NodeDoPostit = Node<DadosDoPostit, "postit">;

/** Post-it de tarefa: cor da trilha, caixinha de concluir e botão de abrir os detalhes. */
function PostitNode({ data }: NodeProps<NodeDoPostit>) {
  const { tarefa, trilha, prazo, aoAbrir, aoConcluir } = data;
  const cor: CorDoMural = trilha?.color ?? "cinza";
  return (
    <article
      aria-label={`Tarefa: ${tarefa.title}`}
      className="flex size-full items-start gap-1 overflow-hidden rounded-[6px] p-2 shadow-[0_10px_24px_-14px_rgb(0_0_0/0.6),0_1px_0_rgb(255_255_255/0.08)_inset]"
      style={{
        background: `color-mix(in srgb, ${varDaCor(cor)} 34%, var(--surface))`,
        color: "var(--ink)",
      }}
    >
      <button
        type="button"
        aria-pressed={false}
        aria-label={`Concluir tarefa: ${tarefa.title}`}
        onClick={() => aoConcluir(tarefa)}
        className="nodrag nopan grid size-10 shrink-0 cursor-pointer place-items-center"
      >
        <span aria-hidden className="border-ink size-5 rounded-full border-2" />
      </button>
      <div className="flex min-w-0 flex-1 flex-col gap-0.5 pt-2">
        <p className="line-clamp-3 text-[15px] leading-snug font-semibold break-words">
          {tarefa.title}
        </p>
        {(prazo || trilha) && (
          <p className="truncate text-[12px] leading-4">
            {[trilha?.name, prazo].filter(Boolean).join(" · ")}
          </p>
        )}
      </div>
      <button
        type="button"
        aria-label={`Abrir detalhes: ${tarefa.title}`}
        onClick={() => aoAbrir(tarefa.id)}
        className="nodrag nopan grid size-10 shrink-0 cursor-pointer place-items-center rounded-full"
      >
        <SquareArrowOutUpRight className="size-4" aria-hidden />
      </button>
    </article>
  );
}

const TIPOS_DE_NODE = { postit: PostitNode };

interface Props {
  tarefas: Tarefa[];
  trilhas: Trilha[];
  hoje: string;
  aoSelecionar: (id: string) => void;
  aoAlternar: (tarefa: Tarefa) => void;
}

/**
 * Mural das Tarefas: todas as tarefas abertas como post-its que a pessoa arrasta para onde
 * quiser (a posição fica salva e vale em qualquer aparelho). Tarefa nova espera na bandeja
 * "Chegando" até ser colocada (toque em "Colocar no mural"), para nunca nascer escondida.
 * É uma visão para ORGANIZAR no espaço; para uma versão em lista (leitor de tela, teclado),
 * a visão Lista mostra as mesmas tarefas.
 */
export function MuralDeTarefas(props: Props) {
  return (
    <ReactFlowProvider>
      <MuralInterno {...props} />
    </ReactFlowProvider>
  );
}

function MuralInterno({ tarefas, trilhas, hoje, aoSelecionar, aoAlternar }: Props) {
  const { data: posicoes } = usePosicoesDeTarefas();
  const salvar = useSalvarPosicao();
  const fluxo = useReactFlow();
  const area = useRef<HTMLDivElement>(null);

  const { noMural, chegando } = useMemo(
    () => separarTarefas(tarefas, posicoes ?? new Map<string, Ponto>()),
    [tarefas, posicoes],
  );
  const trilhaPorId = useMemo(() => new Map(trilhas.map((t) => [t.id, t])), [trilhas]);

  const paraNodes = useCallback(
    (): NodeDoPostit[] =>
      noMural.map(({ tarefa, x, y }) => ({
        id: tarefa.id,
        type: "postit",
        position: { x, y },
        width: LARGURA_DO_POSTIT,
        height: ALTURA_DO_POSTIT,
        data: {
          tarefa,
          trilha: tarefa.track_id ? (trilhaPorId.get(tarefa.track_id) ?? null) : null,
          prazo: formatarPrazo(tarefa.due_on, tarefa.due_time, hoje),
          aoAbrir: aoSelecionar,
          aoConcluir: aoAlternar,
        },
      })),
    [noMural, trilhaPorId, hoje, aoSelecionar, aoAlternar],
  );

  // O React Flow move os nodes durante o arraste (estado local); o cache do banco é a fonte da
  // verdade: sempre que ele muda, refazemos os nodes.
  const [nodes, setNodes, aoMudarNodes] = useNodesState<NodeDoPostit>(paraNodes());
  useEffect(() => {
    setNodes(paraNodes());
  }, [paraNodes, setNodes]);

  /** Centro da área visível, em coordenadas do mural. */
  function centroDaTela(): Ponto {
    const r = area.current?.getBoundingClientRect();
    return r
      ? fluxo.screenToFlowPosition({ x: r.left + r.width / 2, y: r.top + r.height / 2 })
      : { x: 0, y: 0 };
  }

  function colocar(lista: Tarefa[]) {
    const ocupadas: Ponto[] = noMural.map((p) => ({ x: p.x, y: p.y }));
    const centro = centroDaTela();
    for (const tarefa of lista) {
      const p = posicaoLivre(centro, ocupadas);
      ocupadas.push(p);
      salvar.mutate({ taskId: tarefa.id, x: p.x, y: p.y });
    }
  }

  const vazio = noMural.length === 0 && chegando.length === 0;

  return (
    <div className="flex flex-col gap-3">
      {chegando.length > 0 && (
        <section aria-labelledby="titulo-chegando" className="flex flex-col gap-2">
          <div className="flex items-center justify-between gap-3">
            <h2 id="titulo-chegando" className="text-heading-3">
              Chegando <span className="text-ink-muted tabular-nums">· {chegando.length}</span>
            </h2>
            {chegando.length > 1 && (
              <button
                type="button"
                onClick={() => colocar(chegando)}
                className="botao-vidro text-body-sm min-h-11 cursor-pointer px-4 font-semibold"
              >
                Colocar todas
              </button>
            )}
          </div>
          <ul role="list" className="-mx-5 flex gap-2 overflow-x-auto px-5 pb-1">
            {chegando.map((t) => (
              <li key={t.id} className="shrink-0">
                <button
                  type="button"
                  onClick={() => colocar([t])}
                  aria-label={`Colocar no mural: ${t.title}`}
                  className="botao-vidro text-body-sm flex min-h-11 max-w-56 cursor-pointer items-center px-4 font-semibold"
                >
                  <span className="truncate">{t.title}</span>
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}

      {vazio ? (
        <p className="cartao text-ink-muted rounded-xl px-5 py-8 text-center">
          Nenhuma tarefa aberta. Escreva uma tarefa acima e ela aparece aqui para você posicionar.
        </p>
      ) : (
        <div
          ref={area}
          className="fundo-pontilhado border-hairline relative h-[60dvh] min-h-[380px] overflow-hidden rounded-xl border"
        >
          <ReactFlow<NodeDoPostit>
            nodes={nodes}
            edges={[]}
            nodeTypes={TIPOS_DE_NODE}
            onNodesChange={aoMudarNodes}
            onNodeDragStop={(_e, node) =>
              salvar.mutate({
                taskId: node.id,
                x: encaixar(node.position.x),
                y: encaixar(node.position.y),
              })
            }
            onNodeClick={(_e, node) => aoSelecionar(node.id)}
            nodesConnectable={false}
            fitView
            fitViewOptions={{ padding: 0.2, maxZoom: 1 }}
            minZoom={0.2}
            maxZoom={2}
            snapToGrid
            snapGrid={[16, 16]}
            deleteKeyCode={null}
            colorMode="system"
            className="!bg-transparent"
            aria-label="Mural das tarefas"
          >
            <Background variant={BackgroundVariant.Dots} gap={16} size={1} color="transparent" />
            <Panel position="top-right">
              <button
                type="button"
                aria-label="Enquadrar tudo"
                title="Enquadrar tudo"
                onClick={() => fluxo.fitView({ padding: 0.2, maxZoom: 1, duration: 300 })}
                className="botao-vidro grid size-11 cursor-pointer place-items-center"
              >
                <Maximize className="size-5" aria-hidden />
              </button>
            </Panel>
          </ReactFlow>
        </div>
      )}

      <p className="text-ink-muted text-body-sm">
        Arraste os post-its para onde quiser. Prefere uma lista? Use a visão Lista.
      </p>
    </div>
  );
}
