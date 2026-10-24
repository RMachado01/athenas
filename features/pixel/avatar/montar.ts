/**
 * Monta os quadros do avatar a partir das escolhas (cabelo, roupa, acessório) e da pose.
 * Mesma técnica dos pets: camadas → `componer` → contorno automático. Todas as poses e
 * combinações usam a MESMA caixa, então o avatar não "pula" ao trocar de pose ou de cabelo.
 */
import { componer, contornar, type Camada } from "../motor";
import { sobrepor } from "../pets/pecas-extras";
import {
  ACESSORIOS_DO_AVATAR,
  CABECA,
  CABECA_PISCANDO,
  CABELOS,
  POSES,
  ROUPAS,
  type PoseDoAvatar,
  type QuadroDoAvatar,
} from "./pecas";

export interface EscolhasDoAvatar {
  cabelo: string;
  roupa: string;
  acessorio?: string | null;
}

/** Onde cada peça fica (a cabeça é a origem). */
const ALTURA_DA_CABECA = CABECA.length;
const TORSO_X = 1;
const CABELO = { x: -1, y: -1 };

function camadas(q: QuadroDoAvatar, e: EscolhasDoAvatar): Camada[] {
  const cabelo = CABELOS.find((c) => c.id === e.cabelo) ?? CABELOS[0]!;
  const roupa = ROUPAS.find((r) => r.id === e.roupa) ?? ROUPAS[0]!;
  const acessorio = ACESSORIOS_DO_AVATAR.find((a) => a.id === e.acessorio);
  const dy = q.cabecaDy ?? 0;
  const torso = roupa.detalhe ? sobrepor(roupa.detalhe)(q.torso) : q.torso;
  const lista: Camada[] = [];

  if (cabelo.tras) lista.push({ grade: cabelo.tras, x: CABELO.x, y: CABELO.y + dy });
  lista.push({ grade: q.pernas, x: TORSO_X, y: ALTURA_DA_CABECA + q.torso.length });
  lista.push({ grade: torso, x: TORSO_X, y: ALTURA_DA_CABECA });
  lista.push({ grade: q.olhosFechados ? CABECA_PISCANDO : CABECA, x: 0, y: dy });
  lista.push({ grade: cabelo.frente, x: CABELO.x, y: CABELO.y + dy });
  if (acessorio) lista.push({ grade: acessorio.grade, x: acessorio.x, y: acessorio.y + dy });
  return lista;
}

let caixaGuardada: { x0: number; y0: number; largura: number; altura: number } | null = null;

/** Caixa comum a todas as poses, cabelos e acessórios (+1 pixel de margem para o contorno). */
function caixa() {
  if (caixaGuardada) return caixaGuardada;
  let x0 = Infinity;
  let y0 = Infinity;
  let x1 = -Infinity;
  let y1 = -Infinity;
  for (const pose of POSES) {
    for (const q of pose.quadros) {
      for (const cabelo of CABELOS) {
        for (const acessorio of [null, ...ACESSORIOS_DO_AVATAR.map((a) => a.id)]) {
          for (const c of camadas(q, { cabelo: cabelo.id, roupa: ROUPAS[0]!.id, acessorio })) {
            x0 = Math.min(x0, c.x);
            y0 = Math.min(y0, c.y);
            x1 = Math.max(x1, c.x + Math.max(...c.grade.map((l) => l.length)));
            y1 = Math.max(y1, c.y + c.grade.length);
          }
        }
      }
    }
  }
  caixaGuardada = { x0: x0 - 1, y0: y0 - 1, largura: x1 - x0 + 2, altura: y1 - y0 + 2 };
  return caixaGuardada;
}

/** Os quadros (com contorno) de uma pose do avatar. */
export function quadrosDoAvatar(pose: PoseDoAvatar, e: EscolhasDoAvatar): string[][] {
  const anim = POSES.find((p) => p.id === pose);
  if (!anim) throw new Error(`Pose desconhecida: ${pose}`);
  const cx = caixa();
  return anim.quadros.map((q) =>
    contornar(
      componer(
        camadas(q, e).map((c) => ({ ...c, x: c.x - cx.x0, y: c.y - cx.y0 })),
        cx.largura,
        cx.altura,
      ),
    ),
  );
}

export function tamanhoDoAvatar(): { largura: number; altura: number } {
  const { largura, altura } = caixa();
  return { largura, altura };
}
