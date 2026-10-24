"use client";

import { useReducedMotionConfig } from "motion/react";
import { useEffect, useImperativeHandle, useRef, useState, type Ref } from "react";
import {
  acordar,
  CARINHO_MS,
  carinho,
  cochilo,
  comemorar,
  direcaoPara,
  planoDaBolinha,
  planoDoPetisco,
  proximaDecisao,
  type Decisao,
  type Roteiro,
} from "../estados";
import { BALOES, OBJETOS_DA_SALA, PALETA_DO_ZZ, ZZ } from "../extras";
import { animacaoDoEstado, quadrosDoPet, tamanhoDoPet, type EstadoDoPet } from "../pets/animacoes";
import { acharVariacao, CATALOGO, paletaDoPet } from "../pets/catalogo";
import { PALETA_EXTRA } from "../pets/pecas-extras";
import type { PetEscolhido } from "../queries";
import type { EmoteDaReacao } from "../reacoes";
import { Sprite } from "./sprite";

const FRASE_DO_ESTADO: Record<EstadoDoPet, string> = {
  parado: "está de olho em você",
  andando: "está passeando pela sala",
  correndo: "está correndo",
  pulando: "deu um pulinho",
  espreguicando: "está se espreguiçando",
  descansando: "está deitadinho, fazendo companhia",
  bocejando: "bocejou",
  comendo: "está comendo",
  dormindo: "está dormindo",
  feliz: "está feliz",
};

/** S6: sem toque nem tecla na Sala por esse tempo, o pet tira um cochilo. */
export const COCHILO_APOS_MS = 45_000;

/** O que a Sala pode pedir ao pet (os botões de brincar). */
export interface ControleDoPet {
  petisco: () => void;
  bolinha: () => void;
}

type Objeto = { tipo: "tigela" | "bolinha"; de: number; em: number };

/**
 * O pet na sala: anda, para, boceja, dorme (o "cérebro" é `proximaDecisao`), reage ao toque
 * (carinho) e brinca (petisco, bolinha: roteiros prontos executados como uma FILA de passos).
 *
 * - `estudando` (S4): Pomodoro rodando; ele deita ao lado de um livro e não passeia.
 * - `sonolento`: de noite ou depois de dias sem estudar, já começa dormindo.
 * - `comemorarAoAbrir` (S5): meta do dia batida; dá dois pulinhos ao abrir a Sala.
 * - `reacao`: o balão (E2–E8) que a Sala quer mostrar agora.
 * - Sem você mexer na Sala por 45 s, ele cochila; quando você volta, se espreguiça (S6).
 *
 * Com "reduzir movimento" ele não se desloca: fica quieto, e as brincadeiras acontecem no
 * lugar. `posicao` vai de 0 (canto esquerdo) a 1 (direito); o deslocamento é uma transição de
 * CSS (transform), sem animar quadro a quadro em JavaScript.
 */
export function PetNaSala({
  pet,
  escala,
  larguraDaCena,
  estudando = false,
  sonolento = false,
  comemorarAoAbrir = false,
  reacao = null,
  ref,
}: {
  pet: PetEscolhido;
  escala: number;
  larguraDaCena: number;
  estudando?: boolean;
  sonolento?: boolean;
  comemorarAoAbrir?: boolean;
  reacao?: EmoteDaReacao | null;
  ref?: Ref<ControleDoPet>;
}) {
  const reduzido = useReducedMotionConfig();
  const variacao = acharVariacao(pet.especie, pet.variacao);
  const { largura, altura } = tamanhoDoPet(pet.especie);
  const paleta = paletaDoPet(variacao);
  const larguraPx = largura * escala;
  const percurso = Math.max(0, larguraDaCena - larguraPx);
  const escalaPequena = Math.max(2, escala - 1);

  const [estado, setEstado] = useState<EstadoDoPet>("parado");
  const [posicao, setPosicao] = useState(0.5);
  const [direcao, setDirecao] = useState<1 | -1>(1);
  const [caminhadaMs, setCaminhadaMs] = useState(0);
  const [coracoes, setCoracoes] = useState<number[]>([]);
  const [objeto, setObjeto] = useState<Objeto | null>(null);
  // A bolinha nasce no pet e só depois "rola" até o destino (precisa de um quadro no início).
  const [objetoChegou, setObjetoChegou] = useState(false);

  const botao = useRef<HTMLButtonElement>(null);
  const estadoAtual = useRef<EstadoDoPet>("parado");
  const posicaoAtual = useRef(0.5);
  const estudandoAgora = useRef(estudando);
  const controle = useRef<{
    carinho: () => void;
    brincar: (r: Roteiro, tipo: Objeto["tipo"]) => void;
    estudar: (sim: boolean) => void;
  } | null>(null);
  // Só na montagem: dorminhoco e comemoração valem para "ao abrir a Sala".
  const inicio = useRef({ sonolento, comemorarAoAbrir });

  useEffect(() => {
    let relogio: number | undefined;
    let ocioso: number | undefined;
    let cochilando = false;
    const timeouts: number[] = [];
    // Passos de uma brincadeira em andamento; vazia = o cérebro decide sozinho.
    const fila: Decisao[] = [];

    const aplicar = (d: Decisao) => {
      estadoAtual.current = d.estado;
      setEstado(d.estado);
      if (d.alvo !== undefined && (d.estado === "andando" || d.estado === "correndo")) {
        setDirecao(direcaoPara(posicaoAtual.current, d.alvo));
        setCaminhadaMs(d.duracaoMs);
        posicaoAtual.current = d.alvo;
        setPosicao(d.alvo);
      } else {
        setCaminhadaMs(0);
      }
      window.clearTimeout(relogio);
      // Com "reduzir movimento" o pet só sai do lugar (de estado) quando há algo na fila.
      if (!reduzido || fila.length > 0 || d.estado !== "parado") {
        relogio = window.setTimeout(passo, d.duracaoMs);
      }
    };

    const passo = () => {
      // O começo (dormindo/comemorando) já passou: numa nova montagem, começa normal.
      inicio.current = { sonolento: false, comemorarAoAbrir: false };
      const seguinte = fila.shift();
      if (seguinte) {
        aplicar(seguinte);
        return;
      }
      setObjeto(null); // a brincadeira acabou: tigela/bolinha somem
      if (estudandoAgora.current) {
        aplicar({ estado: "descansando", duracaoMs: 60_000 });
        return;
      }
      if (reduzido) {
        aplicar({ estado: "parado", duracaoMs: 1 });
        return;
      }
      aplicar(proximaDecisao(estadoAtual.current, posicaoAtual.current, Math.random));
    };

    /** Para onde está AGORA (no meio de uma caminhada, lê a posição visual). */
    const pararOndeEsta = () => {
      const el = botao.current;
      if (el && percurso > 0) {
        const x = new DOMMatrixReadOnly(getComputedStyle(el).transform).m41;
        posicaoAtual.current = Math.min(1, Math.max(0, x / percurso));
        setPosicao(posicaoAtual.current);
      }
      setCaminhadaMs(0);
    };

    const executar = (passos: Decisao[]) => {
      fila.length = 0;
      fila.push(...passos);
      passo();
    };

    controle.current = {
      carinho: () => {
        pararOndeEsta();
        fila.length = 0;
        setObjeto(null);
        // Com "reduzir movimento" não tem pulinho: vai direto para "feliz" (só o coração).
        aplicar(reduzido ? { estado: "feliz", duracaoMs: CARINHO_MS } : carinho());
        const id = Date.now() + Math.random();
        setCoracoes((c) => [...c, id]);
        timeouts.push(window.setTimeout(() => setCoracoes((c) => c.filter((x) => x !== id)), 1400));
      },
      brincar: (roteiro, tipo) => {
        pararOndeEsta();
        setObjetoChegou(false);
        setObjeto({ tipo, de: posicaoAtual.current, em: roteiro.objetoEm });
        timeouts.push(window.setTimeout(() => setObjetoChegou(true), 30));
        executar(roteiro.passos);
      },
      estudar: (sim) => {
        estudandoAgora.current = sim;
        if (sim) {
          pararOndeEsta();
          executar([]);
        } else if (fila.length === 0) {
          aplicar({ estado: "parado", duracaoMs: 1500 });
        }
      },
    };

    // S6: cochilo por inatividade (e acorda se espreguiçando quando a pessoa volta).
    const armarCochilo = () => {
      window.clearTimeout(ocioso);
      ocioso = window.setTimeout(() => {
        if (fila.length > 0 || estudandoAgora.current) return armarCochilo();
        cochilando = true;
        pararOndeEsta();
        aplicar(cochilo());
      }, COCHILO_APOS_MS);
    };
    const voltou = () => {
      if (cochilando && estadoAtual.current === "dormindo") executar([acordar()]);
      cochilando = false;
      armarCochilo();
    };
    const eventos = ["pointerdown", "keydown", "wheel", "touchstart"] as const;
    eventos.forEach((e) => window.addEventListener(e, voltou, { passive: true }));
    armarCochilo();

    // Começo: estudando junto, comemorando, já dormindo ou só olhando em volta.
    if (estudandoAgora.current) {
      executar([]);
    } else if (inicio.current.comemorarAoAbrir && !reduzido) {
      relogio = window.setTimeout(() => {
        inicio.current = { sonolento: false, comemorarAoAbrir: false };
        executar(comemorar());
      }, 600);
    } else if (inicio.current.sonolento) {
      aplicar({ estado: "dormindo", duracaoMs: 20_000 });
    } else if (!reduzido) {
      relogio = window.setTimeout(passo, 1500);
    }

    return () => {
      window.clearTimeout(relogio);
      window.clearTimeout(ocioso);
      timeouts.forEach((t) => window.clearTimeout(t));
      eventos.forEach((e) => window.removeEventListener(e, voltou));
      controle.current = null;
    };
  }, [reduzido, percurso]);

  // Pomodoro começou/parou enquanto a Sala está aberta.
  useEffect(() => {
    if (estudandoAgora.current !== estudando) controle.current?.estudar(estudando);
  }, [estudando]);

  useImperativeHandle(
    ref,
    () => ({
      petisco: () =>
        controle.current?.brincar(
          planoDoPetisco(posicaoAtual.current, Math.random, Boolean(reduzido)),
          "tigela",
        ),
      bolinha: () =>
        controle.current?.brincar(
          planoDaBolinha(posicaoAtual.current, Math.random, Boolean(reduzido)),
          "bolinha",
        ),
    }),
    [reduzido],
  );

  const info = CATALOGO[pet.especie];
  const desenhoDoObjeto = objeto ? OBJETOS_DA_SALA[objeto.tipo] : null;
  // O objeto fica na frente do focinho (o pet olha para a direita: à direita dele).
  const xDoObjeto = (p: number) => p * percurso + (p >= 0.5 ? -larguraPx * 0.1 : larguraPx * 0.9);
  const balao = coracoes.length === 0 && reacao ? BALOES[reacao] : null;

  return (
    <>
      {estudando && (
        <span
          data-testid="livro-da-sala"
          className="pointer-events-none absolute bottom-[3%] left-0"
          style={{ transform: `translateX(${posicao * percurso + larguraPx * 0.85}px)` }}
        >
          <Sprite
            quadros={[OBJETOS_DA_SALA.livro]}
            paleta={PALETA_EXTRA}
            escala={escalaPequena}
            parado
          />
        </span>
      )}
      {objeto && desenhoDoObjeto && (
        <span
          data-testid={`objeto-${objeto.tipo}`}
          className="pointer-events-none absolute bottom-[3%] left-0"
          style={{
            transform: `translateX(${xDoObjeto(objetoChegou ? objeto.em : objeto.de)}px)`,
            transition:
              objeto.tipo === "bolinha" && !reduzido ? "transform 700ms ease-out" : "none",
          }}
        >
          <Sprite quadros={[desenhoDoObjeto]} paleta={PALETA_EXTRA} escala={escalaPequena} parado />
        </span>
      )}

      <button
        ref={botao}
        type="button"
        onClick={() => controle.current?.carinho()}
        data-estado={estado}
        aria-label={`Fazer carinho em ${pet.nome}`}
        title={`${pet.nome} · ${info.nome} ${variacao.nome}`}
        className="absolute bottom-[3%] left-0 cursor-pointer touch-manipulation"
        style={{
          width: larguraPx,
          height: altura * escala,
          transform: `translateX(${posicao * percurso}px)`,
          transition: caminhadaMs > 0 ? `transform ${caminhadaMs}ms linear` : "none",
        }}
      >
        <span className="block" style={{ transform: direcao === -1 ? "scaleX(-1)" : undefined }}>
          {/* key = estado: ao trocar de estado a animação recomeça do 1º quadro (o pulinho e
              o bocejo duram exatamente um ciclo). */}
          <Sprite
            key={estado}
            quadros={quadrosDoPet(pet.especie, estado, {
              acessorio: pet.acessorio,
              variacao: pet.variacao,
            })}
            paleta={paleta}
            escala={escala}
            duracaoMs={animacaoDoEstado(estado).cicloMs}
          />
        </span>

        {estado === "dormindo" && !balao && (
          <span className="flutua-lento pointer-events-none absolute -top-3 right-0">
            <Sprite quadros={[ZZ]} paleta={PALETA_DO_ZZ} escala={escalaPequena} parado />
          </span>
        )}
        {balao && (
          <span
            data-testid="balao-do-pet"
            data-emote={reacao}
            className="pointer-events-none absolute right-0 bottom-full"
          >
            <Sprite
              key={reacao}
              quadros={[balao]}
              paleta={PALETA_EXTRA}
              escala={escalaPequena}
              parado
            />
          </span>
        )}
        {coracoes.map((id) => (
          <span key={id} className="flutua pointer-events-none absolute -top-8 right-0">
            <Sprite
              quadros={[BALOES.coracao!]}
              paleta={PALETA_EXTRA}
              escala={escalaPequena}
              parado
            />
          </span>
        ))}
      </button>
      {/* Fora do botão: leitor de tela anuncia o que o pet está fazendo sem repetir o botão. */}
      <span className="sr-only" role="status">
        {pet.nome} {FRASE_DO_ESTADO[estado]}
      </span>
    </>
  );
}
