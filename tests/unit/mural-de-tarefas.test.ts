import { describe, expect, it } from "vitest";
import {
  LARGURA_DO_POSTIT,
  ALTURA_DO_POSTIT,
  posicaoLivre,
  separarTarefas,
} from "@/features/tasks/mural";
import type { Tarefa } from "@/features/tasks/tipos";

let n = 0;
function t(campos: Partial<Tarefa> = {}): Tarefa {
  n += 1;
  return {
    id: `t${n}`,
    user_id: "u",
    track_id: null,
    parent_id: null,
    title: `Tarefa ${n}`,
    notes: "",
    priority: 2,
    status: "todo",
    start_on: null,
    due_on: null,
    due_time: null,
    estimate_min: null,
    completed_at: null,
    sort_order: 0,
    created_at: "2026-10-01T00:00:00Z",
    updated_at: "2026-10-01T00:00:00Z",
    grupo: "sem_prazo",
    ...campos,
  };
}

describe("separarTarefas", () => {
  it("tarefa com posição vai para o mural; sem posição, para a bandeja 'Chegando'", () => {
    const a = t();
    const b = t();
    const r = separarTarefas([a, b], new Map([[a.id, { x: 32, y: 48 }]]));
    expect(r.noMural).toEqual([{ tarefa: a, x: 32, y: 48 }]);
    expect(r.chegando).toEqual([b]);
  });

  it("só tarefas abertas e raízes entram (concluída e subtarefa ficam de fora)", () => {
    const mae = t();
    const feita = t({ status: "done", completed_at: "2026-10-05T10:00:00Z" });
    const sub = t({ parent_id: mae.id });
    const r = separarTarefas([mae, feita, sub], new Map([[feita.id, { x: 0, y: 0 }]]));
    expect(r.noMural).toEqual([]);
    expect(r.chegando).toEqual([mae]);
  });

  it("a bandeja vem por prazo, depois prioridade (alta primeiro)", () => {
    const semPrazo = t({ title: "sem prazo" });
    const tarde = t({ title: "tarde", due_on: "2026-10-20" });
    const cedoBaixa = t({ title: "cedo baixa", due_on: "2026-10-08", priority: 1 });
    const cedoAlta = t({ title: "cedo alta", due_on: "2026-10-08", priority: 3 });
    const r = separarTarefas([semPrazo, tarde, cedoBaixa, cedoAlta], new Map());
    expect(r.chegando.map((x) => x.title)).toEqual([
      "cedo alta",
      "cedo baixa",
      "tarde",
      "sem prazo",
    ]);
  });

  it("posição de tarefa que não existe mais é ignorada", () => {
    const a = t();
    const r = separarTarefas([a], new Map([["fantasma", { x: 1, y: 1 }]]));
    expect(r.noMural).toEqual([]);
    expect(r.chegando).toEqual([a]);
  });
});

describe("posicaoLivre", () => {
  const caixa = (x: number, y: number) => ({ x, y, w: LARGURA_DO_POSTIT, h: ALTURA_DO_POSTIT });

  it("sem nada por perto, centraliza o post-it no ponto pedido (encaixado na grade de 16)", () => {
    const p = posicaoLivre({ x: 400, y: 300 }, []);
    expect(p.x % 16).toBe(0);
    expect(p.y % 16).toBe(0);
    // o centro do post-it fica a menos de 1 grade do ponto pedido
    expect(Math.abs(p.x + LARGURA_DO_POSTIT / 2 - 400)).toBeLessThanOrEqual(16);
    expect(Math.abs(p.y + ALTURA_DO_POSTIT / 2 - 300)).toBeLessThanOrEqual(16);
  });

  it("não nasce em cima de outro: desce em diagonal até achar espaço", () => {
    const primeiro = posicaoLivre({ x: 400, y: 300 }, []);
    const segundo = posicaoLivre({ x: 400, y: 300 }, [caixa(primeiro.x, primeiro.y)]);
    expect(segundo).not.toEqual(primeiro);
    // não sobrepõe o primeiro de forma que esconda o título
    const sobrepoeMuito =
      Math.abs(segundo.x - primeiro.x) < 24 && Math.abs(segundo.y - primeiro.y) < 24;
    expect(sobrepoeMuito).toBe(false);
  });

  it("vários pedidos seguidos geram posições todas diferentes", () => {
    const ocupadas: ReturnType<typeof caixa>[] = [];
    const vistas = new Set<string>();
    for (let i = 0; i < 12; i += 1) {
      const p = posicaoLivre({ x: 400, y: 300 }, ocupadas);
      vistas.add(`${p.x},${p.y}`);
      ocupadas.push(caixa(p.x, p.y));
    }
    expect(vistas.size).toBe(12);
  });
});
