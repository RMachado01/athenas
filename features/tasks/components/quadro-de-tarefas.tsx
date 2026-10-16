"use client";

import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  MouseSensor,
  TouchSensor,
  pointerWithin,
  rectIntersection,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type Announcements,
  type CollisionDetection,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { GripVertical, MoreHorizontal, Plus } from "lucide-react";
import { DropdownMenu } from "radix-ui";
import { useRef, useState, type FormEvent } from "react";
import { BarrasDePrioridade } from "@/components/ui/barras-de-prioridade";
import { BotaoCheck } from "@/components/ui/botao-check";
import { Seletor } from "@/components/ui/seletor";
import { varDaCor } from "@/features/boards/cores";
import type { Trilha } from "@/features/tracks/queries";
import { tomDaCor } from "../cores";
import { formatarPrazo } from "../datas";
import type { CamposEditaveis, NovaTarefa } from "../mutations";
import {
  OPCOES_DE_AGRUPAMENTO,
  camposAoMover,
  camposDeNovaTarefa,
  montarColunas,
  type AgruparPor,
  type ColunaDoQuadro,
} from "../quadro";
import type { Tarefa } from "../tipos";

interface Props {
  tarefas: Tarefa[];
  trilhas: Trilha[];
  subtarefas: Map<string, Tarefa[]>;
  hoje: string;
  agruparPor: AgruparPor;
  aoMudarAgrupar: (agrupar: AgruparPor) => void;
  selecionadaId: string | null;
  aoSelecionar: (id: string) => void;
  aoAlternar: (tarefa: Tarefa) => void;
  aoMover: (id: string, campos: CamposEditaveis) => void;
  aoCriar: (nova: Partial<NovaTarefa> & { title: string }) => void;
}

const tom = tomDaCor;

// Primeiro onde o dedo/mouse está; se estiver entre colunas, a que mais se sobrepõe.
const colisao: CollisionDetection = (args) => {
  const dentro = pointerWithin(args);
  return dentro.length > 0 ? dentro : rectIntersection(args);
};

/**
 * Quadro (Kanban) das Tarefas: colunas por Status, Trilha ou Prioridade (botão "Agrupar por").
 * - Arrastar o cartão pela alça (⠿) para outra coluna muda o campo que está agrupando.
 * - Alternativa SEM arrastar (acessibilidade, WCAG 2.5.7): menu "Mover para…" em cada cartão.
 * - No celular as colunas rolam na horizontal e "encaixam"; a alça tem `touch-action: none`,
 *   então só o gesto que começa nela arrasta (o resto continua rolando a tela).
 */
export function QuadroDeTarefas({
  tarefas,
  trilhas,
  subtarefas,
  hoje,
  agruparPor,
  aoMudarAgrupar,
  selecionadaId,
  aoSelecionar,
  aoAlternar,
  aoMover,
  aoCriar,
}: Props) {
  const colunas = montarColunas(tarefas, agruparPor, trilhas);
  const tarefaPorId = new Map(tarefas.map((t) => [t.id, t]));
  const nomeDaTrilha = new Map(trilhas.map((t) => [t.id, t]));
  const [arrastando, setArrastando] = useState<string | null>(null);

  const sensores = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 120, tolerance: 6 } }),
    useSensor(KeyboardSensor),
  );

  const tituloDa = (id: unknown) => tarefaPorId.get(String(id))?.title ?? "tarefa";
  const colunaPorId = (id: unknown) => colunas.find((c) => c.id === String(id));
  const anuncios: Announcements = {
    onDragStart: ({ active }) => `Pegou a tarefa ${tituloDa(active.id)}.`,
    onDragOver: ({ active, over }) =>
      over
        ? `${tituloDa(active.id)} está sobre a coluna ${colunaPorId(over.id)?.titulo}.`
        : undefined,
    onDragEnd: ({ active, over }) =>
      over
        ? `${tituloDa(active.id)} foi solta na coluna ${colunaPorId(over.id)?.titulo}.`
        : `${tituloDa(active.id)} voltou ao lugar.`,
    onDragCancel: ({ active }) => `Movimento cancelado. ${tituloDa(active.id)} voltou ao lugar.`,
  };

  function terminou(e: DragEndEvent) {
    setArrastando(null);
    const tarefa = tarefaPorId.get(String(e.active.id));
    const destino = e.over ? colunaPorId(e.over.id) : undefined;
    if (!tarefa || !destino) return;
    const origem = colunas.find((c) => c.tarefas.some((t) => t.id === tarefa.id));
    if (origem?.id === destino.id) return;
    aoMover(tarefa.id, camposAoMover(agruparPor, destino.id));
  }

  const emArrasto = arrastando ? tarefaPorId.get(arrastando) : undefined;

  return (
    <div className="flex flex-col gap-4">
      <Seletor
        rotulo="Agrupar por"
        opcoes={OPCOES_DE_AGRUPAMENTO.map((o) => ({ valor: o.valor, rotulo: o.rotulo }))}
        valor={agruparPor}
        aoMudar={(v) => aoMudarAgrupar(v as AgruparPor)}
      />

      <DndContext
        sensors={sensores}
        collisionDetection={colisao}
        accessibility={{
          announcements: anuncios,
          screenReaderInstructions: {
            draggable:
              "Para mover a tarefa, aperte Espaço, use as setas para escolher a coluna e aperte Espaço de novo. Esc cancela. Também dá para usar o menu Mover para.",
          },
        }}
        onDragStart={(e: DragStartEvent) => setArrastando(String(e.active.id))}
        onDragEnd={terminou}
        onDragCancel={() => setArrastando(null)}
      >
        <div
          role="region"
          aria-label="Colunas do quadro"
          tabIndex={0}
          className="-mx-5 flex snap-x snap-mandatory items-start gap-3 overflow-x-auto px-5 pb-3"
        >
          {colunas.map((coluna) => (
            <Coluna
              key={coluna.id}
              coluna={coluna}
              agruparPor={agruparPor}
              todas={colunas}
              hoje={hoje}
              subtarefas={subtarefas}
              trilhas={nomeDaTrilha}
              selecionadaId={selecionadaId}
              aoSelecionar={aoSelecionar}
              aoAlternar={aoAlternar}
              aoMover={(id, destino) => aoMover(id, camposAoMover(agruparPor, destino))}
              aoCriar={(titulo) => {
                const extra = camposDeNovaTarefa(agruparPor, coluna.id);
                if (extra) aoCriar({ ...extra, title: titulo });
              }}
            />
          ))}
        </div>

        <DragOverlay dropAnimation={null}>
          {emArrasto ? (
            <div className="rotate-1 opacity-95 shadow-[0_18px_40px_-12px_rgba(0,0,0,0.5)]">
              <CorpoDoCartao
                tarefa={emArrasto}
                hoje={hoje}
                subs={subtarefas.get(emArrasto.id) ?? []}
                trilha={emArrasto.track_id ? (nomeDaTrilha.get(emArrasto.track_id) ?? null) : null}
                mostrarTrilha={agruparPor !== "trilha"}
                selecionada={false}
                aoSelecionar={() => {}}
                aoAlternar={() => {}}
              />
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>

      {agruparPor !== "status" && (
        <p className="text-ink-muted text-body-sm">
          Aqui aparecem só as tarefas abertas. As concluídas ficam no Quadro por Status.
        </p>
      )}
    </div>
  );
}

function Coluna({
  coluna,
  agruparPor,
  todas,
  hoje,
  subtarefas,
  trilhas,
  selecionadaId,
  aoSelecionar,
  aoAlternar,
  aoMover,
  aoCriar,
}: {
  coluna: ColunaDoQuadro;
  agruparPor: AgruparPor;
  todas: ColunaDoQuadro[];
  hoje: string;
  subtarefas: Map<string, Tarefa[]>;
  trilhas: Map<string, Trilha>;
  selecionadaId: string | null;
  aoSelecionar: (id: string) => void;
  aoAlternar: (tarefa: Tarefa) => void;
  aoMover: (id: string, colunaDestino: string) => void;
  aoCriar: (titulo: string) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: coluna.id });
  const podeCriar = camposDeNovaTarefa(agruparPor, coluna.id) !== null;
  const idDoTitulo = `coluna-${coluna.id}`;

  return (
    <section
      ref={setNodeRef}
      aria-labelledby={idDoTitulo}
      className={`flex w-[84%] max-w-80 shrink-0 snap-center flex-col gap-3 rounded-xl p-2.5 transition-shadow duration-(--duration-fast) sm:w-72 ${
        isOver ? "shadow-[0_0_0_2px_var(--accent)]" : ""
      }`}
      style={{ background: tom(coluna.cor, 14) }}
    >
      <header
        className="flex items-center justify-between gap-2 rounded-lg px-3 py-2"
        style={{ background: tom(coluna.cor, 38) }}
      >
        <h2 id={idDoTitulo} className="truncate font-semibold">
          {coluna.titulo}
        </h2>
        <span className="bg-card text-body-sm rounded-pill min-w-7 px-2 py-0.5 text-center font-semibold tabular-nums">
          {coluna.tarefas.length}
        </span>
      </header>

      <ul role="list" className="flex min-h-16 flex-col gap-2">
        {coluna.tarefas.length === 0 && (
          <li className="text-ink-muted text-body-sm border-border-strong rounded-lg border border-dashed px-3 py-5 text-center">
            Nada aqui. Arraste uma tarefa para cá.
          </li>
        )}
        {coluna.tarefas.map((t) => (
          <CartaoDoQuadro
            key={t.id}
            tarefa={t}
            hoje={hoje}
            subs={subtarefas.get(t.id) ?? []}
            trilha={t.track_id ? (trilhas.get(t.track_id) ?? null) : null}
            mostrarTrilha={agruparPor !== "trilha"}
            colunaAtual={coluna.id}
            colunas={todas}
            selecionada={t.id === selecionadaId}
            aoSelecionar={() => aoSelecionar(t.id)}
            aoAlternar={() => aoAlternar(t)}
            aoMover={(destino) => aoMover(t.id, destino)}
          />
        ))}
      </ul>

      {podeCriar && <NovaNaColuna titulo={coluna.titulo} aoCriar={aoCriar} />}
    </section>
  );
}

function NovaNaColuna({ titulo, aoCriar }: { titulo: string; aoCriar: (t: string) => void }) {
  const [aberto, setAberto] = useState(false);
  const campo = useRef<HTMLInputElement>(null);

  function enviar(e: FormEvent) {
    e.preventDefault();
    const texto = campo.current?.value.trim() ?? "";
    if (!texto) return;
    aoCriar(texto);
    if (campo.current) campo.current.value = ""; // continua aberto: dá para anotar várias seguidas
  }

  if (!aberto) {
    return (
      <button
        type="button"
        onClick={() => setAberto(true)}
        aria-label={`Nova tarefa em ${titulo}`}
        className="text-ink-muted hover:text-ink flex min-h-11 cursor-pointer items-center gap-2 rounded-lg px-3 font-semibold"
      >
        <Plus className="size-4" aria-hidden /> Nova
      </button>
    );
  }
  return (
    <form onSubmit={enviar}>
      <label className="sr-only" htmlFor={`nova-${titulo}`}>
        Título da nova tarefa em {titulo}
      </label>
      <input
        id={`nova-${titulo}`}
        ref={campo}
        autoFocus
        maxLength={200}
        autoComplete="off"
        placeholder="Título e Enter"
        onBlur={(e) => !e.target.value.trim() && setAberto(false)}
        onKeyDown={(e) => e.key === "Escape" && setAberto(false)}
        className="campo min-h-11 w-full px-3.5 text-[16px]"
      />
    </form>
  );
}

function CartaoDoQuadro({
  tarefa,
  hoje,
  subs,
  trilha,
  mostrarTrilha,
  colunaAtual,
  colunas,
  selecionada,
  aoSelecionar,
  aoAlternar,
  aoMover,
}: {
  tarefa: Tarefa;
  hoje: string;
  subs: Tarefa[];
  trilha: Trilha | null;
  mostrarTrilha: boolean;
  colunaAtual: string;
  colunas: ColunaDoQuadro[];
  selecionada: boolean;
  aoSelecionar: () => void;
  aoAlternar: () => void;
  aoMover: (colunaDestino: string) => void;
}) {
  const { setNodeRef, setActivatorNodeRef, attributes, listeners, isDragging } = useDraggable({
    id: tarefa.id,
  });

  return (
    <li ref={setNodeRef} className={isDragging ? "opacity-35" : ""}>
      <CorpoDoCartao
        tarefa={tarefa}
        hoje={hoje}
        subs={subs}
        trilha={trilha}
        mostrarTrilha={mostrarTrilha}
        selecionada={selecionada}
        aoSelecionar={aoSelecionar}
        aoAlternar={aoAlternar}
        alca={
          <button
            type="button"
            ref={setActivatorNodeRef}
            {...attributes}
            {...listeners}
            aria-label={`Arrastar tarefa: ${tarefa.title}`}
            className="text-ink-muted grid min-h-11 w-8 shrink-0 cursor-grab touch-none place-items-center rounded-md active:cursor-grabbing"
          >
            <GripVertical className="size-4" aria-hidden />
          </button>
        }
        menu={
          <DropdownMenu.Root>
            <DropdownMenu.Trigger
              aria-label={`Mover tarefa: ${tarefa.title}`}
              className="text-ink-muted hover:text-ink grid size-11 shrink-0 cursor-pointer place-items-center rounded-pill"
            >
              <MoreHorizontal className="size-5" aria-hidden />
            </DropdownMenu.Trigger>
            <DropdownMenu.Portal>
              <DropdownMenu.Content
                align="end"
                sideOffset={4}
                className="menu-flutuante vidro-forte z-50 min-w-[200px] rounded-lg p-1.5"
              >
                <DropdownMenu.Label className="text-label text-ink-muted px-3 py-2 uppercase">
                  Mover para
                </DropdownMenu.Label>
                {colunas
                  .filter((c) => c.id !== colunaAtual)
                  .map((c) => (
                    <DropdownMenu.Item
                      key={c.id}
                      onSelect={() => aoMover(c.id)}
                      className="data-[highlighted]:bg-card flex min-h-11 cursor-pointer items-center gap-3 rounded-md px-3 font-semibold outline-none"
                    >
                      <span
                        aria-hidden
                        className="size-3 shrink-0 rounded-pill"
                        style={{ background: c.cor ? varDaCor(c.cor) : "var(--border-strong)" }}
                      />
                      {c.titulo}
                    </DropdownMenu.Item>
                  ))}
              </DropdownMenu.Content>
            </DropdownMenu.Portal>
          </DropdownMenu.Root>
        }
      />
    </li>
  );
}

/** O cartão em si (sem arrastar): serve ao cartão da coluna e ao "fantasma" que segue o dedo. */
function CorpoDoCartao({
  tarefa,
  hoje,
  subs,
  trilha,
  mostrarTrilha,
  selecionada,
  aoSelecionar,
  aoAlternar,
  alca,
  menu,
}: {
  tarefa: Tarefa;
  hoje: string;
  subs: Tarefa[];
  trilha: Trilha | null;
  mostrarTrilha: boolean;
  selecionada: boolean;
  aoSelecionar: () => void;
  aoAlternar: () => void;
  alca?: React.ReactNode;
  menu?: React.ReactNode;
}) {
  const concluida = tarefa.status === "done";
  const prazo = formatarPrazo(tarefa.due_on, tarefa.due_time, hoje);
  const atrasada = tarefa.grupo === "atrasada";
  const feitas = subs.filter((s) => s.status === "done").length;

  return (
    <div
      className={`cartao flex items-center rounded-lg pr-1 ${selecionada ? "border-accent!" : ""}`}
    >
      {alca}
      <BotaoCheck
        marcado={concluida}
        rotulo={`${concluida ? "Reabrir" : "Concluir"} tarefa: ${tarefa.title}`}
        onAlternar={aoAlternar}
      />
      <button
        type="button"
        onClick={aoSelecionar}
        aria-current={selecionada ? "true" : undefined}
        className="flex min-h-11 min-w-0 flex-1 cursor-pointer flex-col gap-1 py-2.5 text-left"
      >
        <span className={`font-semibold ${concluida ? "text-ink-muted line-through" : ""}`}>
          {tarefa.title}
        </span>
        <span className="text-body-sm flex flex-wrap items-center gap-x-2.5 gap-y-1">
          {mostrarTrilha && trilha && (
            <span className="inline-flex items-center gap-1.5">
              <span
                aria-hidden
                className="size-2.5 rounded-pill"
                style={{ background: varDaCor(trilha.color) }}
              />
              {trilha.name}
            </span>
          )}
          {prazo && <span className={atrasada ? "text-danger" : "text-ink-muted"}>{prazo}</span>}
          {subs.length > 0 && (
            <span className="text-ink-muted tabular-nums">
              {feitas}/{subs.length}
            </span>
          )}
        </span>
      </button>
      <BarrasDePrioridade prioridade={tarefa.priority} />
      {menu}
    </div>
  );
}
