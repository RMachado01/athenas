"use client";

import {
  DndContext,
  MouseSensor,
  TouchSensor,
  pointerWithin,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { Check, ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { useMemo, useRef, useState, type FormEvent } from "react";
import { BotaoCheck } from "@/components/ui/botao-check";
import { FolhaInferior } from "@/components/ui/folha-inferior";
import { diferencaDeDias, partes } from "@/lib/datas";
import type { Trilha } from "@/features/tracks/queries";
import {
  deslocarMes,
  esticarFim,
  esticarInicio,
  faixasDaSemana,
  gradeDoMes,
  moverIntervalo,
  rotuloDoMes,
  tarefasDoDia,
  type FaixaDaSemana,
  type MesDoCalendario,
} from "../calendario";
import { tomDaCor } from "../cores";
import { formatarPrazo } from "../datas";
import type { CamposEditaveis, NovaTarefa } from "../mutations";
import type { Tarefa } from "../tipos";

interface Props {
  tarefas: Tarefa[];
  trilhas: Trilha[];
  hoje: string;
  aoSelecionar: (id: string) => void;
  aoAlternar: (tarefa: Tarefa) => void;
  aoMudarDatas: (id: string, campos: CamposEditaveis) => void;
  aoCriar: (nova: Partial<NovaTarefa> & { title: string }) => void;
}

const DIAS_DA_SEMANA = ["seg", "ter", "qua", "qui", "sex", "sáb", "dom"];
const LIMITE_DE_FAIXAS = 3;
const ALTURA_DA_FAIXA = 24;

const NOME_DO_DIA = new Intl.DateTimeFormat("pt-BR", {
  weekday: "long",
  day: "numeric",
  month: "long",
  timeZone: "UTC",
});
const DIA_E_MES = new Intl.DateTimeFormat("pt-BR", {
  day: "numeric",
  month: "long",
  timeZone: "UTC",
});
const diaMes = (iso: string) => iso.slice(8, 10) + "/" + iso.slice(5, 7);
const dataUtc = (iso: string) => {
  const [a, m, d] = partes(iso);
  return new Date(Date.UTC(a, m - 1, d));
};

/** Dia sob um ponto da tela (procura a célula `[data-dia]` por baixo das barras). */
function diaNoPonto(x: number, y: number): string | null {
  for (const el of document.elementsFromPoint(x, y)) {
    const dia = (el as HTMLElement).dataset?.dia;
    if (dia) return dia;
  }
  return null;
}

/**
 * Calendário do mês das Tarefas (estilo Notion): a tarefa com "Começa em" + prazo vira uma barra
 * que atravessa os dias; só com prazo, um chip no dia. A cor é a da trilha.
 * - Tocar num dia abre a folha do dia (tarefas, caixinha de concluir e "nova tarefa neste dia").
 * - Tocar na barra abre os detalhes. Arrastar a barra move as datas; puxar a ponta estica o período.
 * - Arrastar não é o único jeito (WCAG 2.5.7): o painel de detalhes tem "Começa em" e "Prazo".
 */
export function CalendarioDeTarefas({
  tarefas,
  trilhas,
  hoje,
  aoSelecionar,
  aoAlternar,
  aoMudarDatas,
  aoCriar,
}: Props) {
  const [ano, mesDoHoje] = partes(hoje);
  const [mes, setMes] = useState<MesDoCalendario>({ ano, mes: mesDoHoje });
  const [diaAberto, setDiaAberto] = useState<string | null>(null);
  const semanas = useMemo(() => gradeDoMes(mes.ano, mes.mes), [mes]);
  const corDaTrilha = useMemo(() => new Map(trilhas.map((t) => [t.id, t.color])), [trilhas]);
  const porId = useMemo(() => new Map(tarefas.map((t) => [t.id, t])), [tarefas]);

  const pegouNoDia = useRef<string | null>(null);
  const sensores = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 6 } }),
    // Segurar um instante para arrastar: um toque rápido abre a tarefa e a rolagem não é roubada.
    useSensor(TouchSensor, { activationConstraint: { delay: 250, tolerance: 8 } }),
  );

  function comecou(e: DragStartEvent) {
    const ev = e.activatorEvent;
    const ponto = "touches" in ev ? (ev as TouchEvent).touches[0] : (ev as MouseEvent);
    pegouNoDia.current = ponto ? diaNoPonto(ponto.clientX, ponto.clientY) : null;
  }

  function terminou(e: DragEndEvent) {
    const [id, tipo] = String(e.active.id).split("|");
    const tarefa = id ? porId.get(id) : undefined;
    const destino = e.over ? String(e.over.id) : null;
    if (!tarefa || !destino) return;
    if (tipo === "fim") return aoMudarDatas(tarefa.id, esticarFim(tarefa, destino));
    if (tipo === "inicio") return aoMudarDatas(tarefa.id, esticarInicio(tarefa, destino));
    const origem = pegouNoDia.current;
    if (!origem || origem === destino) return;
    aoMudarDatas(tarefa.id, moverIntervalo(tarefa, diferencaDeDias(origem, destino)));
  }

  const noMesDeHoje = mes.ano === ano && mes.mes === mesDoHoje;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-2">
        <button
          type="button"
          aria-label="Mês anterior"
          onClick={() => setMes((m) => deslocarMes(m, -1))}
          className="botao-vidro grid size-11 cursor-pointer place-items-center"
        >
          <ChevronLeft className="size-5" aria-hidden />
        </button>
        <h2 aria-live="polite" className="text-heading-2 min-w-0 flex-1 truncate text-center">
          {rotuloDoMes(mes.ano, mes.mes)}
        </h2>
        <button
          type="button"
          onClick={() => setMes({ ano, mes: mesDoHoje })}
          disabled={noMesDeHoje}
          className="botao-vidro text-body-sm min-h-11 cursor-pointer px-4 font-semibold disabled:cursor-default disabled:opacity-60"
        >
          Hoje
        </button>
        <button
          type="button"
          aria-label="Próximo mês"
          onClick={() => setMes((m) => deslocarMes(m, 1))}
          className="botao-vidro grid size-11 cursor-pointer place-items-center"
        >
          <ChevronRight className="size-5" aria-hidden />
        </button>
      </div>

      <div className="cartao overflow-hidden rounded-xl">
        <div aria-hidden className="grid grid-cols-7 px-0.5 pt-2 pb-1">
          {DIAS_DA_SEMANA.map((d) => (
            <span key={d} className="text-label text-ink-muted text-center uppercase">
              {d}
            </span>
          ))}
        </div>

        <DndContext
          sensors={sensores}
          collisionDetection={pointerWithin}
          onDragStart={comecou}
          onDragEnd={terminou}
          accessibility={{
            screenReaderInstructions: {
              draggable: "Arrastar muda as datas. Também dá para editar em Detalhes da tarefa.",
            },
          }}
        >
          {semanas.map((semana) => (
            <Semana
              key={semana[0]!.dia}
              semana={semana}
              tarefas={tarefas}
              hoje={hoje}
              corDaTrilha={corDaTrilha}
              aoAbrirDia={setDiaAberto}
              aoSelecionar={aoSelecionar}
              aoAlternar={aoAlternar}
            />
          ))}
        </DndContext>
      </div>

      <FolhaInferior
        aberta={diaAberto !== null}
        aoMudar={(aberta) => !aberta && setDiaAberto(null)}
        titulo={diaAberto ? NOME_DO_DIA.format(dataUtc(diaAberto)) : "Dia"}
      >
        {diaAberto && (
          <DoDia
            dia={diaAberto}
            hoje={hoje}
            tarefas={tarefasDoDia(tarefas, diaAberto)}
            corDaTrilha={corDaTrilha}
            aoAbrir={(id) => {
              setDiaAberto(null);
              aoSelecionar(id);
            }}
            aoAlternar={aoAlternar}
            aoCriar={(titulo) => aoCriar({ title: titulo, due_on: diaAberto })}
          />
        )}
      </FolhaInferior>
    </div>
  );
}

function Semana({
  semana,
  tarefas,
  hoje,
  corDaTrilha,
  aoAbrirDia,
  aoSelecionar,
  aoAlternar,
}: {
  semana: { dia: string; doMes: boolean }[];
  tarefas: Tarefa[];
  hoje: string;
  corDaTrilha: Map<string, Trilha["color"]>;
  aoAbrirDia: (dia: string) => void;
  aoSelecionar: (id: string) => void;
  aoAlternar: (tarefa: Tarefa) => void;
}) {
  const { faixas, totalDeFaixas, ocultasPorColuna } = faixasDaSemana(
    semana.map((c) => c.dia),
    tarefas,
    LIMITE_DE_FAIXAS,
  );
  const linhasDeFaixa = Math.min(totalDeFaixas, LIMITE_DE_FAIXAS);
  const temOcultas = ocultasPorColuna.some((n) => n > 0);
  // 1ª linha = número do dia; depois uma linha por faixa; no fim, a linha do "+N" (se houver).
  const linhas = `28px repeat(${linhasDeFaixa}, ${ALTURA_DA_FAIXA}px)${temOcultas ? " 16px" : ""}`;

  return (
    <div
      className="border-hairline relative grid min-h-[72px] grid-cols-7 gap-y-0.5 border-t"
      style={{ gridTemplateRows: linhas, paddingBottom: 4 }}
    >
      {semana.map((c, coluna) => (
        <CelulaDoDia
          key={c.dia}
          dia={c.dia}
          coluna={coluna}
          doMes={c.doMes}
          ehHoje={c.dia === hoje}
          quantas={tarefasDoDia(tarefas, c.dia).length}
          aoAbrir={() => aoAbrirDia(c.dia)}
        />
      ))}

      {faixas.map((f) => (
        <Barra
          key={f.tarefa.id}
          faixa={f}
          cor={f.tarefa.track_id ? (corDaTrilha.get(f.tarefa.track_id) ?? null) : null}
          aoSelecionar={() => aoSelecionar(f.tarefa.id)}
          aoAlternar={() => aoAlternar(f.tarefa)}
        />
      ))}

      {temOcultas &&
        ocultasPorColuna.map((n, coluna) =>
          n > 0 ? (
            <span
              key={coluna}
              aria-hidden
              style={{ gridColumn: coluna + 1, gridRow: linhasDeFaixa + 2 }}
              className="text-ink-muted pointer-events-none z-10 px-1.5 text-[12px] leading-4 font-semibold"
            >
              +{n}
            </span>
          ) : null,
        )}
    </div>
  );
}

function CelulaDoDia({
  dia,
  coluna,
  doMes,
  ehHoje,
  quantas,
  aoAbrir,
}: {
  dia: string;
  coluna: number;
  doMes: boolean;
  ehHoje: boolean;
  quantas: number;
  aoAbrir: () => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: dia });
  return (
    <button
      ref={setNodeRef}
      type="button"
      data-dia={dia}
      onClick={aoAbrir}
      aria-label={`${DIA_E_MES.format(dataUtc(dia))}, ${quantas === 0 ? "sem tarefas" : quantas === 1 ? "1 tarefa" : `${quantas} tarefas`}`}
      style={{ gridColumn: coluna + 1, gridRow: "1 / -1" }}
      className={`flex cursor-pointer items-start justify-center pt-1 transition-colors duration-(--duration-instant) ${
        isOver ? "bg-[color-mix(in_srgb,var(--accent)_22%,transparent)]" : "hover:bg-card"
      } ${coluna > 0 ? "border-hairline border-l" : ""}`}
    >
      <span
        aria-hidden
        className={`grid size-6 place-items-center rounded-pill text-[13px] leading-none font-semibold tabular-nums ${
          ehHoje ? "bg-accent text-on-accent" : doMes ? "" : "text-ink-muted"
        }`}
      >
        {Number(dia.slice(8, 10))}
      </span>
    </button>
  );
}

function Barra({
  faixa,
  cor,
  aoSelecionar,
  aoAlternar,
}: {
  faixa: FaixaDaSemana;
  cor: Trilha["color"] | null;
  aoSelecionar: () => void;
  aoAlternar: () => void;
}) {
  const { tarefa, coluna, extensao, continuaAntes, continuaDepois } = faixa;
  const concluida = tarefa.status === "done";
  const periodo = tarefa.start_on && tarefa.start_on !== tarefa.due_on;
  const {
    setNodeRef: refDaBarra,
    listeners: gestoDaBarra,
    transform: deslocamento,
    isDragging: arrastando,
  } = useDraggable({ id: `${tarefa.id}|mover` });
  const { setNodeRef: refDaPontaEsquerda, listeners: gestoDaPontaEsquerda } = useDraggable({
    id: `${tarefa.id}|inicio`,
  });
  const { setNodeRef: refDaPontaDireita, listeners: gestoDaPontaDireita } = useDraggable({
    id: `${tarefa.id}|fim`,
  });

  return (
    <div
      ref={refDaBarra}
      {...gestoDaBarra}
      style={{
        gridColumn: `${coluna + 1} / span ${extensao}`,
        gridRow: faixa.faixa + 2,
        background: tomDaCor(cor, concluida ? 14 : 30),
        transform: CSS.Translate.toString(deslocamento),
        touchAction: "manipulation",
      }}
      className={`relative z-10 mx-px flex min-w-0 cursor-grab items-center gap-0.5 active:cursor-grabbing ${
        continuaAntes ? "" : "rounded-l-md"
      } ${continuaDepois ? "" : "rounded-r-md"} ${arrastando ? "z-20 shadow-lg" : ""}`}
    >
      {/* Ponta esquerda: estica o início (só numa borda de verdade, não na quebra de semana). */}
      {periodo && !continuaAntes && (
        <span
          ref={refDaPontaEsquerda}
          {...gestoDaPontaEsquerda}
          aria-hidden
          className="absolute inset-y-0 -left-1 z-10 w-3 cursor-ew-resize touch-none"
        />
      )}

      {extensao >= 2 && (
        <button
          type="button"
          aria-pressed={concluida}
          aria-label={`${concluida ? "Reabrir" : "Concluir"} tarefa: ${tarefa.title}`}
          onClick={aoAlternar}
          className="ml-0.5 grid size-6 shrink-0 cursor-pointer place-items-center"
        >
          <span
            className={`grid size-4 place-items-center rounded-[4px] border-[1.5px] ${
              concluida ? "border-accent bg-accent" : "border-ink bg-transparent"
            }`}
          >
            {concluida && <Check className="text-on-accent size-3" strokeWidth={3.5} aria-hidden />}
          </span>
        </button>
      )}
      <button
        type="button"
        onClick={aoSelecionar}
        aria-label={`${tarefa.title}${
          periodo ? `, de ${diaMes(tarefa.start_on!)} a ${diaMes(tarefa.due_on!)}` : ""
        }. Abrir detalhes`}
        className={`text-ink min-h-6 min-w-0 flex-1 cursor-pointer truncate px-1 text-left text-[12px] leading-6 font-semibold ${
          concluida ? "line-through" : ""
        }`}
      >
        {tarefa.title}
      </button>

      {periodo && !continuaDepois && (
        <span
          ref={refDaPontaDireita}
          {...gestoDaPontaDireita}
          aria-hidden
          className="absolute inset-y-0 -right-1 z-10 w-3 cursor-ew-resize touch-none"
        />
      )}
    </div>
  );
}

function DoDia({
  dia,
  hoje,
  tarefas,
  corDaTrilha,
  aoAbrir,
  aoAlternar,
  aoCriar,
}: {
  dia: string;
  hoje: string;
  tarefas: Tarefa[];
  corDaTrilha: Map<string, Trilha["color"]>;
  aoAbrir: (id: string) => void;
  aoAlternar: (tarefa: Tarefa) => void;
  aoCriar: (titulo: string) => void;
}) {
  const campo = useRef<HTMLInputElement>(null);

  function enviar(e: FormEvent) {
    e.preventDefault();
    const texto = campo.current?.value.trim() ?? "";
    if (!texto) return;
    aoCriar(texto);
    if (campo.current) campo.current.value = "";
  }

  return (
    <div className="flex flex-col gap-4">
      {tarefas.length === 0 ? (
        <p className="text-ink-muted">Nenhuma tarefa neste dia.</p>
      ) : (
        <ul role="list" className="flex flex-col gap-2">
          {tarefas.map((t) => {
            const concluida = t.status === "done";
            const prazo = formatarPrazo(t.due_on, t.due_time, hoje);
            return (
              <li key={t.id} className="cartao flex items-center rounded-lg pr-3">
                <BotaoCheck
                  marcado={concluida}
                  rotulo={`${concluida ? "Reabrir" : "Concluir"} tarefa: ${t.title}`}
                  onAlternar={() => aoAlternar(t)}
                />
                <button
                  type="button"
                  onClick={() => aoAbrir(t.id)}
                  className="flex min-h-11 min-w-0 flex-1 cursor-pointer flex-col py-2 text-left"
                >
                  <span
                    className={`font-semibold ${concluida ? "text-ink-muted line-through" : ""}`}
                  >
                    {t.title}
                  </span>
                  <span className="text-body-sm text-ink-muted flex items-center gap-2">
                    {t.track_id && corDaTrilha.has(t.track_id) && (
                      <span
                        aria-hidden
                        className="size-2.5 rounded-pill"
                        style={{ background: tomDaCor(corDaTrilha.get(t.track_id)!, 100) }}
                      />
                    )}
                    {t.start_on && t.start_on !== t.due_on
                      ? `${diaMes(t.start_on)} a ${diaMes(t.due_on!)}`
                      : (prazo ?? "")}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}

      <form onSubmit={enviar} className="flex gap-2">
        <label className="sr-only" htmlFor="nova-no-dia">
          Nova tarefa para {dia.slice(8, 10)}/{dia.slice(5, 7)}
        </label>
        <input
          id="nova-no-dia"
          ref={campo}
          maxLength={200}
          autoComplete="off"
          placeholder="Nova tarefa neste dia"
          className="campo rounded-pill min-h-12 min-w-0 flex-1 bg-transparent px-5 text-[16px] outline-none"
        />
        <button
          type="submit"
          aria-label="Adicionar tarefa neste dia"
          className="botao-primario grid size-12 shrink-0 cursor-pointer place-items-center"
        >
          <Plus className="size-5" strokeWidth={2.5} aria-hidden />
        </button>
      </form>
    </div>
  );
}
