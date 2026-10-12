"use client";

import "@xyflow/react/dist/style.css";
import {
  Background,
  BackgroundVariant,
  MarkerType,
  ReactFlow,
  ReactFlowProvider,
  useNodesState,
  useReactFlow,
  type Connection,
  type Edge,
  type NodeChange,
} from "@xyflow/react";
import {
  ArrowLeft,
  Frame,
  Link2,
  List,
  ListChecks,
  Maximize,
  StickyNote,
  Trash2,
  Type,
} from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import {
  paraEdges,
  paraNodes,
  posicaoAbsoluta,
  proximaCamada,
  type NodeDoMural,
} from "../conversao";
import {
  encaixar,
  grupoSobOPonto,
  paraRelativa,
  posicaoDeNovoItem,
  type Camera,
  type TipoDeItem,
} from "../geometria";
import { useOperacoesDoMural, type ItemDoMural, type MuralCompleto } from "../queries";
import { QuadroContexto, type ContextoDoQuadro } from "./contexto";
import { EdicaoDeItem } from "./edicao-de-item";
import { EscolherTarefa } from "./escolher-tarefa";
import { TIPOS_DE_NODE } from "./itens-do-quadro";
import { ListaDoMural } from "./lista-do-mural";

/**
 * O quadro de um mural (React Flow). Ocupa a tela toda, por cima da barra do app.
 * Toque: pinça = zoom, arrastar o vazio = mover; arrastar item = mover item (salva ao soltar).
 */
export function Quadro({ dados, voltarPara }: { dados: MuralCompleto; voltarPara: string }) {
  return (
    <ReactFlowProvider>
      <QuadroInterno dados={dados} voltarPara={voltarPara} />
    </ReactFlowProvider>
  );
}

function QuadroInterno({ dados, voltarPara }: { dados: MuralCompleto; voltarPara: string }) {
  const { mural, itens, ligacoes } = dados;
  const ops = useOperacoesDoMural(mural.id);
  const fluxo = useReactFlow();

  const [selecionados, setSelecionados] = useState<Set<string>>(new Set());
  const [ligacaoSelecionada, setLigacaoSelecionada] = useState<string | null>(null);
  const [emEdicao, setEmEdicao] = useState<string | null>(null);
  const [escolhendoTarefa, setEscolhendoTarefa] = useState(false);
  const [modoLigar, setModoLigar] = useState(false);
  const [origemDaLigacao, setOrigemDaLigacao] = useState<string | null>(null);
  const [lista, setLista] = useState(false);

  // Nodes ficam num estado local (o React Flow move durante o arraste); o banco é a fonte
  // da verdade: sempre que os itens mudam no cache, refazemos os nodes mantendo a seleção.
  const [nodes, setNodes, aoMudarNodes] = useNodesState<NodeDoMural>(
    paraNodes(itens, selecionados),
  );
  useEffect(() => {
    setNodes(paraNodes(itens, selecionados));
    // eslint-disable-next-line react-hooks/exhaustive-deps -- seleção é preservada, não dispara
  }, [itens, setNodes]);
  const edges = useMemo(
    () =>
      paraEdges(ligacoes, ligacaoSelecionada).map((e) => ({
        ...e,
        markerEnd: { type: MarkerType.ArrowClosed, color: "var(--ink-muted)" },
        style: { stroke: "var(--ink-muted)", strokeWidth: 1.75 },
      })),
    [ligacoes, ligacaoSelecionada],
  );

  // ---- câmera: salva ao parar de mover (com espera) e ao sair -------------------------
  const cameraAtual = useRef<Camera>(mural.camera);
  const timerCamera = useRef<number | null>(null);
  const salvarCameraDepois = useCallback(
    (c: Camera) => {
      cameraAtual.current = c;
      if (timerCamera.current) window.clearTimeout(timerCamera.current);
      timerCamera.current = window.setTimeout(() => ops.salvarCamera(c), 1500);
    },
    [ops],
  );
  useEffect(
    () => () => {
      if (timerCamera.current) {
        window.clearTimeout(timerCamera.current);
        ops.salvarCamera(cameraAtual.current);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps -- só ao desmontar
    [],
  );

  // ---- adicionar itens -------------------------------------------------------------
  const adicionar = useCallback(
    (tipo: TipoDeItem, extra: Partial<ItemDoMural> = {}) => {
      const camera = fluxo.getViewport();
      const ocupados = itens.map((i) => ({ ...posicaoAbsoluta(i, itens), w: i.w, h: i.h }));
      const r = posicaoDeNovoItem(
        tipo,
        camera,
        { largura: window.innerWidth, altura: window.innerHeight },
        ocupados,
      );
      const novo: ItemDoMural = {
        id: crypto.randomUUID(),
        tipo,
        ...r,
        z: proximaCamada(itens),
        cor: tipo === "grupo" ? "azul" : "amarelo",
        texto: tipo === "titulo" ? "Título" : tipo === "grupo" ? "Grupo" : "",
        tarefaId: null,
        grupoId: null,
        ...extra,
      };
      ops.criarItem(novo);
      setSelecionados(new Set([novo.id]));
      if (tipo === "nota") setEmEdicao(novo.id);
    },
    [fluxo, itens, ops],
  );

  // ---- mover: ao soltar, salva a posição e entra/sai de grupos -----------------------
  const aoSoltar = useCallback(
    (_e: unknown, _node: NodeDoMural, movidos: NodeDoMural[]) => {
      const grupos = itens
        .filter((i) => i.tipo === "grupo")
        .map((g) => ({ id: g.id, ...posicaoAbsoluta(g, itens), w: g.w, h: g.h, z: g.z }));
      for (const n of movidos) {
        const item = itens.find((i) => i.id === n.id);
        if (!item) continue;
        const pai = item.grupoId ? itens.find((i) => i.id === item.grupoId) : undefined;
        const absoluta = pai
          ? { x: n.position.x + pai.x, y: n.position.y + pai.y }
          : { x: n.position.x, y: n.position.y };
        if (item.tipo === "grupo") {
          ops.atualizarItem(item.id, { x: encaixar(absoluta.x), y: encaixar(absoluta.y) });
          continue;
        }
        const centro = { x: absoluta.x + item.w / 2, y: absoluta.y + item.h / 2 };
        const novoGrupo = grupoSobOPonto(centro, grupos, item.id);
        const base = novoGrupo ? paraRelativa(absoluta, novoGrupo) : absoluta;
        ops.atualizarItem(item.id, {
          x: encaixar(base.x),
          y: encaixar(base.y),
          grupoId: novoGrupo?.id ?? null,
        });
      }
    },
    [itens, ops],
  );

  // ---- ligar: modo "toca a origem, toca o destino" (celular) ou arrastar o ponto (PC) --
  const criarLigacao = useCallback(
    (de: string, para: string) => {
      if (de === para) return;
      if (ligacoes.some((l) => l.de === de && l.para === para)) {
        toast("Esses itens já estão ligados.");
        return;
      }
      ops.criarLigacao({ id: crypto.randomUUID(), de, para, rotulo: "" });
    },
    [ligacoes, ops],
  );

  const aoTocarItem = useCallback(
    (_e: unknown, node: NodeDoMural) => {
      if (!modoLigar) return;
      if (!origemDaLigacao) {
        setOrigemDaLigacao(node.id);
        return;
      }
      criarLigacao(origemDaLigacao, node.id);
      setOrigemDaLigacao(null);
      setModoLigar(false);
    },
    [modoLigar, origemDaLigacao, criarLigacao],
  );

  const aoMudar = useCallback(
    (mudancas: NodeChange<NodeDoMural>[]) => {
      // Remoção é tratada por nós (com "Desfazer"); o resto o React Flow aplica sozinho.
      aoMudarNodes(mudancas.filter((m) => m.type !== "remove"));
      const sel = mudancas.filter((m) => m.type === "select");
      if (sel.length > 0) {
        setSelecionados((atual) => {
          const novo = new Set(atual);
          for (const m of sel) {
            if (m.type !== "select") continue;
            if (m.selected) novo.add(m.id);
            else novo.delete(m.id);
          }
          return novo;
        });
      }
    },
    [aoMudarNodes],
  );

  const apagarSelecionados = useCallback(() => {
    if (ligacaoSelecionada) {
      ops.apagarLigacao(ligacaoSelecionada);
      setLigacaoSelecionada(null);
      return;
    }
    for (const id of selecionados) ops.apagarItem(id);
    setSelecionados(new Set());
  }, [ligacaoSelecionada, selecionados, ops]);

  const contexto = useMemo<ContextoDoQuadro>(
    () => ({
      atualizarItem: ops.atualizarItem,
      abrirEdicao: setEmEdicao,
      modoLigar,
      origemDaLigacao,
    }),
    [ops.atualizarItem, modoLigar, origemDaLigacao],
  );

  const umSelecionado = selecionados.size === 1 ? [...selecionados][0]! : null;
  const itemEmEdicao = emEdicao ? itens.find((i) => i.id === emEdicao) : undefined;

  return (
    <QuadroContexto.Provider value={contexto}>
      <div className="fundo-pontilhado fixed inset-0 z-40 flex flex-col">
        {/* Barra do topo */}
        <header className="flex items-center gap-2 px-3 pt-[calc(0.5rem+env(safe-area-inset-top))] pb-2">
          <Link
            href={voltarPara}
            aria-label="Voltar aos murais"
            className="botao-vidro grid size-11 shrink-0 place-items-center"
          >
            <ArrowLeft className="size-5" aria-hidden />
          </Link>
          <h1 className="min-w-0 flex-1 truncate text-[17px] font-semibold">{mural.titulo}</h1>
          <button
            type="button"
            onClick={() => setLista((v) => !v)}
            aria-pressed={lista}
            aria-label={lista ? "Ver como quadro" : "Ver como lista"}
            className="botao-vidro grid size-11 shrink-0 cursor-pointer place-items-center"
          >
            {lista ? (
              <Frame className="size-5" aria-hidden />
            ) : (
              <List className="size-5" aria-hidden />
            )}
          </button>
        </header>

        {lista ? (
          <ListaDoMural
            itens={itens}
            ligacoes={ligacoes}
            aoEditar={setEmEdicao}
            aoApagar={(id) => ops.apagarItem(id)}
          />
        ) : (
          <div className="relative min-h-0 flex-1">
            <ReactFlow<NodeDoMural, Edge>
              nodes={nodes}
              edges={edges}
              nodeTypes={TIPOS_DE_NODE}
              onNodesChange={aoMudar}
              onNodeDragStop={aoSoltar}
              onNodeClick={aoTocarItem}
              onEdgeClick={(_e, edge) => {
                setLigacaoSelecionada(edge.id);
                setSelecionados(new Set());
              }}
              onPaneClick={() => {
                setLigacaoSelecionada(null);
                if (modoLigar) {
                  setModoLigar(false);
                  setOrigemDaLigacao(null);
                }
              }}
              onConnect={(c: Connection) =>
                c.source && c.target && criarLigacao(c.source, c.target)
              }
              onMoveEnd={(_e, v) => salvarCameraDepois(v)}
              defaultViewport={mural.camera}
              minZoom={0.1}
              maxZoom={4}
              snapToGrid
              snapGrid={[16, 16]}
              deleteKeyCode={null}
              onKeyDown={(e) => {
                if ((e.key === "Delete" || e.key === "Backspace") && !emEdicao) {
                  const alvo = e.target as HTMLElement;
                  if (alvo.tagName !== "INPUT" && alvo.tagName !== "TEXTAREA") apagarSelecionados();
                }
              }}
              colorMode="system"
              className="!bg-transparent"
              aria-label={`Quadro do mural ${mural.titulo}`}
            >
              <Background variant={BackgroundVariant.Dots} gap={16} size={1} color="transparent" />
            </ReactFlow>

            {modoLigar && (
              <p
                role="status"
                className="vidro-forte text-body-sm pointer-events-none absolute top-2 left-1/2 -translate-x-1/2 rounded-pill px-4 py-2 font-semibold"
              >
                {origemDaLigacao ? "Agora toque no item de destino" : "Toque no item de origem"}
              </p>
            )}
          </div>
        )}

        {/* Barra de ferramentas (embaixo, flutuante) */}
        <nav
          aria-label="Ferramentas do mural"
          className="vidro rounded-pill mx-auto mb-[calc(0.75rem+env(safe-area-inset-bottom))] flex max-w-[calc(100%-1.5rem)] items-center gap-1 overflow-x-auto p-1.5"
        >
          <Ferramenta rotulo="Post-it" onClick={() => adicionar("nota")} Icone={StickyNote} />
          <Ferramenta rotulo="Título" onClick={() => adicionar("titulo")} Icone={Type} />
          <Ferramenta rotulo="Grupo" onClick={() => adicionar("grupo")} Icone={Frame} />
          <Ferramenta
            rotulo="Tarefa"
            onClick={() => setEscolhendoTarefa(true)}
            Icone={ListChecks}
          />
          {!lista && (
            <>
              <Ferramenta
                rotulo="Ligar"
                ativo={modoLigar}
                onClick={() => {
                  setModoLigar((v) => !v);
                  setOrigemDaLigacao(null);
                }}
                Icone={Link2}
              />
              <Ferramenta
                rotulo="Enquadrar"
                onClick={() => fluxo.fitView({ padding: 0.2, duration: 300 })}
                Icone={Maximize}
              />
            </>
          )}
          {(umSelecionado || selecionados.size > 1 || ligacaoSelecionada) && !lista && (
            <>
              {umSelecionado && (
                <button
                  type="button"
                  onClick={() => setEmEdicao(umSelecionado)}
                  className="botao-primario text-body-sm min-h-11 shrink-0 cursor-pointer px-4 font-semibold"
                >
                  Editar
                </button>
              )}
              <Ferramenta
                rotulo={ligacaoSelecionada ? "Apagar ligação" : "Apagar"}
                onClick={apagarSelecionados}
                Icone={Trash2}
              />
            </>
          )}
        </nav>
      </div>

      <EdicaoDeItem
        item={itemEmEdicao ?? null}
        aoFechar={() => setEmEdicao(null)}
        aoMudar={(mudanca) => itemEmEdicao && ops.atualizarItem(itemEmEdicao.id, mudanca)}
        aoApagar={() => {
          if (itemEmEdicao) ops.apagarItem(itemEmEdicao.id);
          setEmEdicao(null);
        }}
      />

      <EscolherTarefa
        aberta={escolhendoTarefa}
        aoMudar={setEscolhendoTarefa}
        jaNoMural={new Set(itens.flatMap((i) => (i.tarefaId ? [i.tarefaId] : [])))}
        aoEscolher={(tarefaId) => {
          setEscolhendoTarefa(false);
          adicionar("tarefa", { tarefaId });
        }}
      />
    </QuadroContexto.Provider>
  );
}

function Ferramenta({
  rotulo,
  onClick,
  Icone,
  ativo = false,
}: {
  rotulo: string;
  onClick: () => void;
  Icone: React.ComponentType<{ className?: string; "aria-hidden"?: boolean }>;
  ativo?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={rotulo}
      aria-pressed={ativo || undefined}
      title={rotulo}
      className={`grid size-11 shrink-0 cursor-pointer place-items-center rounded-full transition-colors ${
        ativo ? "bg-accent text-on-accent" : "text-ink hover:bg-card"
      }`}
    >
      <Icone className="size-5" aria-hidden />
    </button>
  );
}
