"use client";

import { Undo2, X } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { AnelDeProgresso } from "@/components/ui/anel-de-progresso";
import { BarraDeProgresso } from "@/components/ui/barra-de-progresso";
import { Esqueleto } from "@/components/ui/esqueleto";
import { useRegistrarSessao } from "@/features/focus/queries";
import { AVALIACOES, previa, responder, type Avaliacao } from "../agendador";
import { proximoDaFila, reinserir, trechosDeEstudo, type CartaoDaFila } from "../fila";
import { ehConflito, useDesfazerResposta, useFila, useResponderCartao } from "../queries";
import { CartaoDaRevisao } from "./cartao-da-revisao";

// Cor de cada botão (borda + texto). O fundo é o do cartão: o contraste vem do tema.
const TOM: Record<(typeof AVALIACOES)[number]["tom"], string> = {
  danger: "border-danger text-danger",
  warning: "border-warning text-warning",
  accent: "border-accent text-accent",
  success: "border-success text-success",
};

interface Resposta {
  reviewId: string;
  /** O cartão como estava ANTES da resposta (para desfazer). */
  cartao: CartaoDaFila;
  avaliacao: Avaliacao;
  em: Date;
}

/** Sessão de revisão em tela cheia: virar, avaliar com 4 botões, desfazer, resumo no fim. */
export function RevisaoView({
  baralhoId,
  caminhoBase = "/flashcards",
}: {
  baralhoId: string | null;
  caminhoBase?: string;
}) {
  const { data, isPending, isError, refetch } = useFila(baralhoId);
  if (isError) {
    return (
      <main className="px-5 pt-8">
        <p role="alert" className="border-danger text-danger rounded-lg border p-4">
          Não deu pra carregar a revisão.{" "}
          <button type="button" onClick={() => refetch()} className="underline">
            Tentar de novo
          </button>
        </p>
      </main>
    );
  }
  if (isPending) {
    return (
      <main aria-busy="true" className="flex flex-col gap-4 px-5 pt-6">
        <span className="sr-only">Carregando revisão</span>
        <Esqueleto className="h-2 w-full" />
        <Esqueleto className="h-[46dvh] w-full rounded-3xl" />
      </main>
    );
  }
  return (
    <Sessao
      filaInicial={data.fila}
      novosPausados={data.novosPausados}
      atrasados={data.atrasados}
      caminhoBase={caminhoBase}
    />
  );
}

function Sessao({
  filaInicial,
  novosPausados,
  atrasados,
  caminhoBase,
}: {
  filaInicial: CartaoDaFila[];
  novosPausados: boolean;
  atrasados: number;
  caminhoBase: string;
}) {
  const responderNoBanco = useResponderCartao();
  const desfazerNoBanco = useDesfazerResposta();
  const { mutate: registrarSessao } = useRegistrarSessao();
  const [fila, setFila] = useState(filaInicial);
  const [respostas, setRespostas] = useState<Resposta[]>([]);
  const [virado, setVirado] = useState(false);
  const [agora, setAgora] = useState(() => new Date());
  const [inicio] = useState(() => new Date());
  const mostradoEm = useRef(inicio);

  const atual = proximoDaFila(fila, agora);
  const opcoes = useMemo(() => (atual ? previa(atual.estado, agora) : null), [atual, agora]);
  const feitos = respostas.length;
  const progresso = feitos + fila.length === 0 ? 100 : (feitos / (feitos + fila.length)) * 100;

  // Cartões em aprendizagem vencem em minutos: reavalia o "agora" a cada 15 s.
  useEffect(() => {
    const t = window.setInterval(() => setAgora(new Date()), 15_000);
    return () => window.clearInterval(t);
  }, []);

  const avaliar = useCallback(
    (avaliacao: Avaliacao) => {
      if (!atual || !virado) return;
      const quando = new Date();
      const novo = responder(atual.estado, avaliacao, quando);
      const reviewId = crypto.randomUUID();
      if (avaliacao === 1 && document.documentElement.dataset.motion !== "reduced") {
        navigator.vibrate?.(20);
      }
      responderNoBanco.mutate(
        {
          reviewId,
          cartao: atual,
          avaliacao,
          novo,
          duracaoMs: quando.getTime() - mostradoEm.current.getTime(),
        },
        {
          onError: (erro) => {
            if (ehConflito(erro)) {
              setFila((f) => f.filter((c) => c.id !== atual.id));
              toast.error("Este cartão foi respondido em outro aparelho. Ele sai desta sessão.", {
                id: "responder-cartao",
              });
            } else {
              toast.error(
                "Não deu pra salvar uma resposta. Confira a conexão; as próximas continuam sendo salvas.",
                { id: "responder-cartao" },
              );
            }
          },
        },
      );
      setRespostas((r) => [...r, { reviewId, cartao: atual, avaliacao, em: quando }]);
      setFila(reinserir(fila, { ...atual, estado: novo }, quando));
      setAgora(quando);
      setVirado(false);
      mostradoEm.current = new Date();
    },
    [atual, virado, fila, responderNoBanco],
  );

  const desfazer = useCallback(() => {
    const ultima = respostas.at(-1);
    if (!ultima) return;
    desfazerNoBanco.mutate(
      { reviewId: ultima.reviewId },
      {
        onError: () => toast.error("Não deu pra desfazer. Tente de novo.", { id: "desfazer" }),
      },
    );
    setRespostas((r) => r.slice(0, -1));
    setFila((f) => [ultima.cartao, ...f.filter((c) => c.id !== ultima.cartao.id)]);
    setVirado(true);
    mostradoEm.current = new Date();
  }, [respostas, desfazerNoBanco]);

  // Teclado: Espaço/Enter vira; 1–4 avaliam; Ctrl+Z desfaz.
  useEffect(() => {
    const aoTeclar = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLElement && e.target.closest("input, textarea, [contenteditable]"))
        return;
      if ((e.key === " " || e.key === "Enter") && !virado && atual) {
        e.preventDefault();
        setVirado(true);
      } else if (virado && ["1", "2", "3", "4"].includes(e.key)) {
        avaliar(Number(e.key) as Avaliacao);
      } else if (e.key.toLowerCase() === "z" && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        desfazer();
      }
    };
    window.addEventListener("keydown", aoTeclar);
    return () => window.removeEventListener("keydown", aoTeclar);
  }, [virado, atual, avaliar, desfazer]);

  // Tempo de estudo vai para o Foco (trechos de pelo menos 1 min), uma vez só: no fim da sessão
  // ou ao sair da tela.
  const trechos = useMemo(
    () => trechosDeEstudo([inicio, ...respostas.map((r) => r.em)]),
    [inicio, respostas],
  );
  const gravado = useRef(false);
  const gravarTempo = useCallback(() => {
    if (gravado.current || trechos.length === 0) return;
    gravado.current = true;
    for (const t of trechos) {
      registrarSessao({
        inicio: t.inicio,
        fim: t.fim,
        minutosPlanejados: Math.max(1, Math.round((t.fim.getTime() - t.inicio.getTime()) / 60_000)),
        taskId: null,
        trackId: null,
        origem: "revisao",
      });
    }
  }, [trechos, registrarSessao]);
  const gravarTempoRef = useRef(gravarTempo);
  useEffect(() => {
    gravarTempoRef.current = gravarTempo;
  }, [gravarTempo]);
  useEffect(() => () => gravarTempoRef.current(), []);
  const terminou = !atual && feitos > 0;
  useEffect(() => {
    if (terminou) gravarTempo();
  }, [terminou, gravarTempo]);

  return (
    <main className="flex min-h-dvh flex-col gap-5 px-5 pt-[calc(1rem+env(safe-area-inset-top))] pb-[calc(1.5rem+env(safe-area-inset-bottom))]">
      <header className="flex items-center gap-3">
        <Link
          href={caminhoBase}
          aria-label="Encerrar revisão"
          className="botao-vidro grid size-11 shrink-0 place-items-center"
        >
          <X className="size-5" aria-hidden />
        </Link>
        <BarraDeProgresso valor={progresso} rotulo="Progresso da revisão" className="flex-1" />
        <button
          type="button"
          onClick={desfazer}
          disabled={feitos === 0}
          aria-label="Desfazer última resposta"
          className="botao-vidro grid size-11 shrink-0 cursor-pointer place-items-center disabled:cursor-default disabled:opacity-40"
        >
          <Undo2 className="size-5" aria-hidden />
        </button>
      </header>

      {novosPausados && atual && (
        <p className="cartao text-body-sm rounded-lg p-3">
          Você tem {atrasados} revisões atrasadas. Cartões novos voltam quando elas estiverem em
          dia.
        </p>
      )}

      {atual && opcoes ? (
        <>
          <span className="sr-only" aria-live="polite">
            {fila.length} {fila.length === 1 ? "cartão restante" : "cartões restantes"}
          </span>
          <CartaoDaRevisao
            key={`${atual.id}-${atual.estado.reps}`}
            frente={atual.frente}
            verso={atual.verso}
            virado={virado}
            aoVirar={() => setVirado(true)}
          />
          <div className="mt-auto">
            {virado ? (
              <div role="group" aria-label="Como foi?" className="grid grid-cols-4 gap-2">
                {AVALIACOES.map((a) => (
                  <button
                    key={a.valor}
                    type="button"
                    onClick={() => avaliar(a.valor)}
                    aria-label={`${a.rotulo}, próxima revisão em ${opcoes[a.valor].intervalo}`}
                    aria-keyshortcuts={String(a.valor)}
                    className={`tocavel flex min-h-14 cursor-pointer flex-col items-center justify-center rounded-2xl border bg-[var(--card)] px-1 ${TOM[a.tom]}`}
                  >
                    <span className="text-body-sm font-semibold">{a.rotulo}</span>
                    <span className="text-ink-muted text-[12px]">{opcoes[a.valor].intervalo}</span>
                  </button>
                ))}
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setVirado(true)}
                aria-keyshortcuts="Space"
                className="botao-primario min-h-14 w-full cursor-pointer font-semibold"
              >
                Mostrar resposta
              </button>
            )}
          </div>
        </>
      ) : terminou ? (
        <Resumo respostas={respostas} trechos={trechos} caminhoBase={caminhoBase} />
      ) : (
        <div className="flex flex-1 flex-col items-center justify-center gap-4 text-center">
          <h1 className="text-heading-1">Nada para revisar agora</h1>
          <p className="text-ink-muted">Seus cartões estão em dia. Volte mais tarde.</p>
          <Link
            href={caminhoBase}
            className="botao-vidro grid min-h-12 place-items-center px-6 font-semibold"
          >
            Voltar aos baralhos
          </Link>
        </div>
      )}
    </main>
  );
}

function Resumo({
  respostas,
  trechos,
  caminhoBase,
}: {
  respostas: Resposta[];
  trechos: { inicio: Date; fim: Date }[];
  caminhoBase: string;
}) {
  // Acerto = a ÚLTIMA resposta de cada cartão não foi "Errei".
  const ultimaDeCada = new Map(respostas.map((r) => [r.cartao.id, r.avaliacao]));
  const cartoes = ultimaDeCada.size;
  const acertos = [...ultimaDeCada.values()].filter((a) => a > 1).length;
  const pct = cartoes === 0 ? 0 : Math.round((acertos / cartoes) * 100);
  const minutos = Math.round(
    trechos.reduce((s, t) => s + (t.fim.getTime() - t.inicio.getTime()), 0) / 60_000,
  );

  return (
    <section
      aria-labelledby="titulo-resumo"
      className="flex flex-1 flex-col items-center justify-center gap-5 text-center"
    >
      <AnelDeProgresso valor={pct} rotulo={`${pct}% de acertos`}>
        <span className="text-heading-1 font-semibold">{pct}%</span>
      </AnelDeProgresso>
      <div className="flex flex-col gap-1">
        <h1 id="titulo-resumo" className="text-heading-1">
          Sessão concluída
        </h1>
        <p className="text-ink-muted">
          {cartoes} {cartoes === 1 ? "cartão revisado" : "cartões revisados"} ·{" "}
          {minutos < 1 ? "menos de 1 min" : `${minutos} min`}
        </p>
      </div>
      <Link
        href={caminhoBase}
        className="botao-primario grid min-h-14 w-full place-items-center font-semibold"
      >
        Voltar aos baralhos
      </Link>
    </section>
  );
}
