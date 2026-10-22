"use client";

import { useReducedMotionConfig } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { PALETA_DO_ZZ, ZZ } from "../extras";
import { CARINHO_MS, carinho, direcaoPara, proximaDecisao, type Decisao } from "../estados";
import { animacaoDoEstado, quadrosDoPet, tamanhoDoPet, type EstadoDoPet } from "../pets/animacoes";
import { acharVariacao, CATALOGO, paletaDoPet } from "../pets/catalogo";
import { EMOTES, PALETA_EXTRA } from "../pets/pecas-extras";
import type { PetEscolhido } from "../queries";
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

/** Balão de coração (E1) que sobe no carinho. */
const BALAO_DE_CORACAO = EMOTES.find((e) => e.id === "coracao")!.grade;

/**
 * O pet na sala: anda, para, dorme (o "cérebro" é `proximaDecisao`) e reage ao toque com um
 * carinho (pulinho + coração). Com "reduzir movimento" ele fica quieto; o toque só mostra o
 * coração. `posicao` vai de 0 (canto esquerdo) a 1 (canto direito); o deslocamento é uma
 * transição de CSS (transform), sem animar quadro a quadro em JavaScript.
 */
export function PetNaSala({
  pet,
  escala,
  larguraDaCena,
}: {
  pet: PetEscolhido;
  escala: number;
  larguraDaCena: number;
}) {
  const reduzido = useReducedMotionConfig();
  const variacao = acharVariacao(pet.especie, pet.variacao);
  const { largura, altura } = tamanhoDoPet(pet.especie);
  const paleta = paletaDoPet(variacao);
  const larguraPx = largura * escala;
  const percurso = Math.max(0, larguraDaCena - larguraPx);

  const [estado, setEstado] = useState<EstadoDoPet>("parado");
  const [posicao, setPosicao] = useState(0.5);
  const [direcao, setDirecao] = useState<1 | -1>(1);
  const [caminhadaMs, setCaminhadaMs] = useState(0);
  const [coracoes, setCoracoes] = useState<number[]>([]);

  const botao = useRef<HTMLButtonElement>(null);
  const estadoAtual = useRef<EstadoDoPet>("parado");
  const posicaoAtual = useRef(0.5);
  const controle = useRef<{ carinho: () => void } | null>(null);

  useEffect(() => {
    let relogio: number | undefined;
    const timeouts: number[] = [];

    const aplicar = (d: Decisao) => {
      estadoAtual.current = d.estado;
      setEstado(d.estado);
      if (d.estado === "andando" && d.alvo !== undefined) {
        setDirecao(direcaoPara(posicaoAtual.current, d.alvo));
        setCaminhadaMs(d.duracaoMs);
        posicaoAtual.current = d.alvo;
        setPosicao(d.alvo);
      } else {
        setCaminhadaMs(0);
      }
      if (!reduzido || d.estado === "feliz") {
        window.clearTimeout(relogio);
        relogio = window.setTimeout(passo, d.duracaoMs);
      }
    };

    const passo = () => {
      if (reduzido) {
        // Quieto: depois do carinho, só volta a ficar parado.
        aplicar({ estado: "parado", duracaoMs: 1 });
        return;
      }
      aplicar(proximaDecisao(estadoAtual.current, posicaoAtual.current, Math.random));
    };

    controle.current = {
      carinho: () => {
        // Se estava andando, para onde está agora (lê a posição visual atual).
        const el = botao.current;
        if (el && percurso > 0) {
          const x = new DOMMatrixReadOnly(getComputedStyle(el).transform).m41;
          posicaoAtual.current = Math.min(1, Math.max(0, x / percurso));
          setPosicao(posicaoAtual.current);
        }
        setCaminhadaMs(0);
        // Com "reduzir movimento" não tem pulinho: vai direto para "feliz" (só o coração).
        aplicar(reduzido ? { estado: "feliz", duracaoMs: CARINHO_MS } : carinho());
        const id = Date.now() + Math.random();
        setCoracoes((c) => [...c, id]);
        timeouts.push(window.setTimeout(() => setCoracoes((c) => c.filter((x) => x !== id)), 1400));
      },
    };

    if (!reduzido) relogio = window.setTimeout(passo, 1500);
    return () => {
      window.clearTimeout(relogio);
      timeouts.forEach((t) => window.clearTimeout(t));
      controle.current = null;
    };
  }, [reduzido, percurso]);

  const info = CATALOGO[pet.especie];

  return (
    <>
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

        {estado === "dormindo" && (
          <span className="flutua-lento pointer-events-none absolute -top-3 right-0">
            <Sprite quadros={[ZZ]} paleta={PALETA_DO_ZZ} escala={Math.max(2, escala - 1)} parado />
          </span>
        )}
        {coracoes.map((id) => (
          <span key={id} className="flutua pointer-events-none absolute -top-8 right-0">
            <Sprite
              quadros={[BALAO_DE_CORACAO]}
              paleta={PALETA_EXTRA}
              escala={Math.max(2, escala - 1)}
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
