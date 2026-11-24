/**
 * Onde o avatar senta na Sala (em pixels da sala, 160 x 100) e a cadeira embaixo dele.
 * A mão de escrever (pose "sentado") apoia na beirada do tampo da mesa; as outras poses
 * sentadas usam o MESMO lugar (as pernas ficam no mesmo ponto), então ele não "pula".
 */
import { CHAO_Y } from "../sala/desenho";
import { PERNAS_EM, POSES } from "./corpo";
import { naGrade } from "./montar";

/** A mesa da sala (ver mesaComAbajur em sala/desenho.ts). */
export const MESA = { x: 54, tampo: 62 } as const;

export interface Retangulo {
  x: number;
  y: number;
  w: number;
  h: number;
  cor: string;
}

export function lugarDoAvatar(): { x: number; y: number; cadeira: Retangulo[] } {
  const escrevendo = POSES.find((p) => p.id === "sentado")!.quadros[0]!;
  const mao = naGrade(escrevendo.maoEm);
  const coxa = naGrade(PERNAS_EM);
  const x = MESA.x + 3 - mao.x;
  const y = MESA.tampo - 1 - mao.y;
  const assento = y + coxa.y + 2;
  const cx = x + coxa.x;
  const perna = CHAO_Y - assento - 2;
  return {
    x,
    y,
    cadeira: [
      { x: cx, y: assento, w: 12, h: 2, cor: "#6b4a2f" }, // assento
      { x: cx - 1, y: assento - 14, w: 2, h: 16, cor: "#5a3d26" }, // encosto
      { x: cx, y: assento + 2, w: 2, h: perna, cor: "#5a3d26" },
      { x: cx + 10, y: assento + 2, w: 2, h: perna, cor: "#5a3d26" },
    ],
  };
}
