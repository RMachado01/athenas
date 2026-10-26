/**
 * Monta o avatar RPG: corpo (pose) + itens equipados em cada parte, camada por camada, e põe o
 * contorno automático. Todas as poses e combinações usam a MESMA caixa, então o avatar não
 * "pula" ao trocar de pose, cabelo ou item.
 */
import { componer, contornar, type Camada, type Grade, type Paleta } from "../motor";
import { sobrepor } from "../pets/pecas-extras";
import {
  CABECA,
  CABECA_PISCANDO,
  OLHOS_CORES,
  PELES,
  PERNAS_EM,
  POSES,
  TORSO_EM,
  type PoseDoAvatar,
  type QuadroDoCorpo,
} from "./corpo";
import { CABELOS, CORES_DE_CABELO, ITENS, type Item, type Parte } from "./itens";

export interface EscolhasDoAvatar {
  pele: string;
  olhos: string;
  cabelo: string;
  corDoCabelo: string;
  /** Item equipado em cada parte (id). Blusa, pernas e pés sempre têm algo (padrão). */
  equipados: Partial<Record<Parte, string | null>>;
}

/** O que vem vestido quando a pessoa não escolheu nada naquela parte. */
export const PADRAO: Record<"blusa" | "pernas" | "pes", string> = {
  blusa: "camiseta",
  pernas: "calca",
  pes: "tenis",
};

function itemEquipado(e: EscolhasDoAvatar, parte: Parte): Item | undefined {
  const id = e.equipados[parte] ?? (parte in PADRAO ? PADRAO[parte as keyof typeof PADRAO] : null);
  return id ? ITENS.find((i) => i.id === id && i.parte === parte) : undefined;
}

/** Troca letras numa grade (só nas linhas/colunas que `onde` aceitar). */
function trocar(
  g: Grade,
  mapa: Record<string, string>,
  onde: (x: number, y: number) => boolean = () => true,
): string[] {
  return g.map((linha, y) =>
    Array.from(linha, (ch, x) => (onde(x, y) && mapa[ch] ? mapa[ch] : ch)).join(""),
  );
}

const ROUPA_PARA_PELE = { c: "s", f: "y", d: "z" };
const CALCA_PARA_PELE = { t: "s", n: "y", p: "z" };

function camadas(q: QuadroDoCorpo, e: EscolhasDoAvatar): Camada[] {
  const cabelo = CABELOS.find((c) => c.id === e.cabelo) ?? CABELOS[0]!;
  const blusa = itemEquipado(e, "blusa");
  const pernas = itemEquipado(e, "pernas");
  const pes = itemEquipado(e, "pes");
  const dy = q.cabecaDy ?? 0;
  const lista: Camada[] = [];
  const noLugar = (item: Item | undefined, desloca = 0) => {
    if (item?.grade && item.em)
      lista.push({ grade: item.grade, x: item.em.x, y: item.em.y + desloca });
  };

  noLugar(itemEquipado(e, "costas"));
  if (cabelo.tras)
    lista.push({ grade: cabelo.tras, x: cabelo.frenteEm.x, y: cabelo.frenteEm.y + dy });

  // Pernas: bermuda/saia mostram pele embaixo; botas cobrem a última linha da canela.
  let gradePernas: Grade = q.pernas;
  if (pernas?.peleDesdeALinha !== undefined) {
    const desde = pernas.peleDesdeALinha;
    gradePernas = trocar(gradePernas, CALCA_PARA_PELE, (_x, y) => y >= desde);
  }
  if (pes?.cano) {
    const canela = gradePernas.findIndex((l) => /[qgr]/.test(l)) - 1;
    gradePernas = trocar(
      gradePernas,
      { t: "q", n: "g", p: "r", s: "q", y: "g", z: "r" },
      (_x, y) => y === canela,
    );
  }
  lista.push({ grade: gradePernas, x: PERNAS_EM.x, y: PERNAS_EM.y });

  const torso = blusa?.detalheDoTorso ? sobrepor(blusa.detalheDoTorso)(q.torso) : q.torso;
  lista.push({ grade: torso, x: TORSO_EM.x, y: TORSO_EM.y });
  noLugar(blusa); // capuz, por cima do torso e atrás da cabeça

  // Braço: manga curta vira pele do cotovelo para baixo (braço em pé) ou para a frente (na mesa).
  const larguraDoBraco = q.braco[0]!.length;
  const braco = blusa?.mangaCurta
    ? trocar(q.braco, ROUPA_PARA_PELE, (x, y) =>
        larguraDoBraco > q.braco.length ? x >= 4 : y >= 3,
      )
    : q.braco;
  lista.push({ grade: braco, x: q.bracoEm.x, y: q.bracoEm.y });

  const mao = itemEquipado(e, "mao");
  if (mao?.grade && mao.ancora) {
    lista.push({ grade: mao.grade, x: q.maoEm.x - mao.ancora.x, y: q.maoEm.y - mao.ancora.y });
  }

  lista.push({ grade: q.olhosFechados ? CABECA_PISCANDO : CABECA, x: 0, y: dy });
  lista.push({ grade: cabelo.frente, x: cabelo.frenteEm.x, y: cabelo.frenteEm.y + dy });
  noLugar(itemEquipado(e, "rosto"), dy);
  noLugar(itemEquipado(e, "cabeca"), dy);
  return lista;
}

let caixaGuardada: { x0: number; y0: number; largura: number; altura: number } | null = null;

/** Caixa comum: todas as poses x cabelos x cada item de cada parte (+1 de margem). */
function caixa() {
  if (caixaGuardada) return caixaGuardada;
  let x0 = Infinity;
  let y0 = Infinity;
  let x1 = -Infinity;
  let y1 = -Infinity;
  const base: EscolhasDoAvatar = {
    pele: "p1",
    olhos: "castanho",
    cabelo: "curto",
    corDoCabelo: "preto",
    equipados: {},
  };
  const variantes: EscolhasDoAvatar[] = [
    ...CABELOS.map((c) => ({ ...base, cabelo: c.id })),
    ...ITENS.map((i) => ({ ...base, equipados: { [i.parte]: i.id } })),
  ];
  for (const pose of POSES) {
    for (const q of pose.quadros) {
      for (const v of variantes) {
        for (const c of camadas(q, v)) {
          x0 = Math.min(x0, c.x);
          y0 = Math.min(y0, c.y);
          x1 = Math.max(x1, c.x + Math.max(...c.grade.map((l) => l.length)));
          y1 = Math.max(y1, c.y + c.grade.length);
        }
      }
    }
  }
  caixaGuardada = { x0: x0 - 1, y0: y0 - 1, largura: x1 - x0 + 2, altura: y1 - y0 + 2 };
  return caixaGuardada;
}

/** Os quadros (com contorno) de uma pose do avatar com o que ele está vestindo. */
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

/** A paleta completa: pele, olhos, cabelo e as cores de cada item vestido. */
export function paletaDoAvatar(e: EscolhasDoAvatar): Paleta {
  const pele = PELES.find((p) => p.id === e.pele) ?? PELES[0]!;
  const olhos = OLHOS_CORES.find((o) => o.id === e.olhos) ?? OLHOS_CORES[0]!;
  const cabelo = CORES_DE_CABELO.find((c) => c.id === e.corDoCabelo) ?? CORES_DE_CABELO[0]!;
  const paleta: Record<string, string> = {
    o: "#2b1a14", // contorno (o mesmo dos pets)
    y: pele.y,
    s: pele.s,
    z: pele.z,
    b: pele.b,
    m: "#9a3b45",
    e: "#2b1a14",
    x: olhos.x,
    w: "#ffffff",
    l: cabelo.l,
    h: cabelo.h,
    j: cabelo.j,
  };
  for (const parte of ["costas", "pernas", "pes", "blusa", "mao", "rosto", "cabeca"] as const) {
    Object.assign(paleta, itemEquipado(e, parte)?.cores ?? {});
  }
  return paleta;
}

/** Onde um ponto do corpo (ex.: a mão, o topo das pernas) cai na grade final do avatar. */
export function naGrade(p: { x: number; y: number }): { x: number; y: number } {
  const cx = caixa();
  return { x: p.x - cx.x0, y: p.y - cx.y0 };
}
