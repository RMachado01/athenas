/**
 * Geometria do mural (funções puras, sem React Flow): grade, tamanhos, onde nasce um item novo
 * e a conversão de posição relativa ↔ absoluta para itens dentro de grupos.
 *
 * Sistema de coordenadas: o do "mundo" do quadro (px quando o zoom é 1). A câmera (viewport)
 * diz quanto o mundo está deslocado e ampliado na tela: tela = mundo * zoom + deslocamento.
 */

export type TipoDeItem = "nota" | "tarefa" | "titulo" | "grupo";

export const GRADE = 16;

/** Encaixa um valor na grade de 16 px (dá alinhamento "de Notion" sem esforço). */
export function encaixar(valor: number, grade = GRADE): number {
  return Math.round(valor / grade) * grade;
}

export const TAMANHO_PADRAO: Record<TipoDeItem, { w: number; h: number }> = {
  nota: { w: 208, h: 176 },
  tarefa: { w: 256, h: 96 },
  titulo: { w: 320, h: 64 },
  grupo: { w: 480, h: 320 },
};

/** Tamanho mínimo por tipo (o banco aceita de 40 a 4000; aqui é o que fica legível). */
export const TAMANHO_MINIMO: Record<TipoDeItem, { w: number; h: number }> = {
  nota: { w: 112, h: 80 },
  tarefa: { w: 192, h: 72 },
  titulo: { w: 112, h: 48 },
  grupo: { w: 160, h: 112 },
};

export const TAMANHO_MAXIMO = 4000;

export function limitarTamanho(tipo: TipoDeItem, w: number, h: number): { w: number; h: number } {
  const min = TAMANHO_MINIMO[tipo];
  const lim = (v: number, m: number) => Math.min(TAMANHO_MAXIMO, Math.max(m, Math.round(v)));
  return { w: lim(w, min.w), h: lim(h, min.h) };
}

export interface Camera {
  x: number;
  y: number;
  zoom: number;
}

export interface Retangulo {
  x: number;
  y: number;
  w: number;
  h: number;
}

/** Centro da área visível, em coordenadas do mundo. */
export function centroVisivel(camera: Camera, tela: { largura: number; altura: number }) {
  const zoom = camera.zoom > 0 ? camera.zoom : 1;
  return {
    x: (tela.largura / 2 - camera.x) / zoom,
    y: (tela.altura / 2 - camera.y) / zoom,
  };
}

function sobrepoe(a: Retangulo, b: Retangulo): boolean {
  return a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;
}

/**
 * Onde nasce um item novo: centralizado na tela, encaixado na grade. Se já houver um item
 * exatamente ali, desce em diagonal (+32, +32) até achar um canto livre (máx. 20 tentativas),
 * para itens novos não ficarem empilhados invisíveis um sobre o outro.
 */
export function posicaoDeNovoItem(
  tipo: TipoDeItem,
  camera: Camera,
  tela: { largura: number; altura: number },
  existentes: readonly Retangulo[],
): Retangulo {
  const { w, h } = TAMANHO_PADRAO[tipo];
  const c = centroVisivel(camera, tela);
  let r: Retangulo = { x: encaixar(c.x - w / 2), y: encaixar(c.y - h / 2), w, h };
  for (let i = 0; i < 20; i++) {
    const ocupado = existentes.some(
      (e) => sobrepoe(r, e) && Math.abs(e.x - r.x) < 24 && Math.abs(e.y - r.y) < 24,
    );
    if (!ocupado) break;
    r = { ...r, x: r.x + 2 * GRADE, y: r.y + 2 * GRADE };
  }
  return r;
}

/** Posição de um filho dentro do grupo (React Flow guarda filhos em coordenada relativa ao pai). */
export function paraRelativa(absoluta: { x: number; y: number }, grupo: { x: number; y: number }) {
  return { x: absoluta.x - grupo.x, y: absoluta.y - grupo.y };
}

export function paraAbsoluta(relativa: { x: number; y: number }, grupo: { x: number; y: number }) {
  return { x: relativa.x + grupo.x, y: relativa.y + grupo.y };
}

/** O centro do item caiu dentro de algum grupo? Devolve o grupo mais de cima (maior z). */
export function grupoSobOPonto<T extends Retangulo & { id: string; z: number }>(
  ponto: { x: number; y: number },
  grupos: readonly T[],
  ignorarId?: string,
): T | null {
  const candidatos = grupos.filter(
    (g) =>
      g.id !== ignorarId &&
      ponto.x >= g.x &&
      ponto.x <= g.x + g.w &&
      ponto.y >= g.y &&
      ponto.y <= g.y + g.h,
  );
  return candidatos.sort((a, b) => b.z - a.z)[0] ?? null;
}

/** Retângulo que envolve todos os itens (para "Enquadrar tudo"). null se o mural está vazio. */
export function envoltorio(itens: readonly Retangulo[]): Retangulo | null {
  if (itens.length === 0) return null;
  const x = Math.min(...itens.map((i) => i.x));
  const y = Math.min(...itens.map((i) => i.y));
  const x2 = Math.max(...itens.map((i) => i.x + i.w));
  const y2 = Math.max(...itens.map((i) => i.y + i.h));
  return { x, y, w: x2 - x, h: y2 - y };
}
