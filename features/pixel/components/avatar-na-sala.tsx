"use client";

import { useReducedMotionConfig } from "motion/react";
import { useEffect, useMemo, useState } from "react";
import { POSES, type PoseDoAvatar } from "../avatar/corpo";
import { paraEscolhas, type AvatarSalvo } from "../avatar/modelo";
import { lugarDoAvatar } from "../avatar/na-sala";
import { paletaDoAvatar, quadrosDoAvatar, tamanhoDoAvatar } from "../avatar/montar";
import { ALTURA_DA_SALA, LARGURA_DA_SALA } from "../sala/desenho";
import { Sprite } from "./sprite";

/** Quanto tempo dura o "oi" de chegada (3 acenos). */
const ACENO_MS = 1800;

const FRASE: Record<string, string> = {
  acenandoSentado: "acenando para você",
  sentado: "estudando junto (escrevendo)",
  lendo: "lendo na mesa",
};

/**
 * O avatar sentado na cadeira, à esquerda da mesa da biblioteca. Ao abrir a Sala ele dá um
 * "oi" (aceno sentado); depois fica lendo — ou escrevendo, se há um Pomodoro de foco rodando.
 * Tocar abre o editor. Usa a escala da PRÓPRIA sala (não inteira como a do pet), para a mão
 * cair certinho no tampo da mesa. A cadeira faz parte da cena (fica cinza no tema mono).
 */
export function AvatarNaSala({
  avatar,
  larguraDaCena,
  estudando,
  aoTocar,
}: {
  avatar: AvatarSalvo;
  larguraDaCena: number;
  estudando: boolean;
  aoTocar: () => void;
}) {
  const reduzido = useReducedMotionConfig();
  const [acenando, setAcenando] = useState(!reduzido);
  useEffect(() => {
    if (!acenando) return;
    const id = window.setTimeout(() => setAcenando(false), ACENO_MS);
    return () => window.clearTimeout(id);
  }, [acenando]);

  const pose: PoseDoAvatar = acenando ? "acenandoSentado" : estudando ? "sentado" : "lendo";
  const escolhas = useMemo(() => paraEscolhas(avatar), [avatar]);
  const quadros = useMemo(() => quadrosDoAvatar(pose, escolhas), [pose, escolhas]);
  const paleta = useMemo(() => paletaDoAvatar(escolhas), [escolhas]);
  const { largura, altura } = tamanhoDoAvatar();
  const lugar = lugarDoAvatar();
  const px = larguraDaCena / LARGURA_DA_SALA; // 1 pixel da sala, em pixels da tela

  return (
    <>
      <svg
        aria-hidden="true"
        focusable="false"
        viewBox={`0 0 ${LARGURA_DA_SALA} ${ALTURA_DA_SALA}`}
        preserveAspectRatio="none"
        shapeRendering="crispEdges"
        className="cenario-sala pointer-events-none absolute inset-0 size-full"
      >
        {lugar.cadeira.map((r, i) => (
          <rect key={i} x={r.x} y={r.y} width={r.w} height={r.h} fill={r.cor} />
        ))}
      </svg>
      <button
        type="button"
        onClick={aoTocar}
        data-testid="avatar-na-sala"
        data-pose={pose}
        aria-label="Editar seu avatar"
        className="absolute cursor-pointer touch-manipulation"
        style={{ left: lugar.x * px, top: lugar.y * px, width: largura * px, height: altura * px }}
      >
        <Sprite
          key={pose}
          quadros={quadros}
          paleta={paleta}
          escala={px}
          duracaoMs={POSES.find((p) => p.id === pose)!.cicloMs}
        />
      </button>
      <span className="sr-only" role="status">
        Seu avatar está {FRASE[pose]}
      </span>
    </>
  );
}
