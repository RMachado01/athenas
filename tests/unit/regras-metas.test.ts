import { describe, expect, it } from "vitest";
import {
  descreverProgresso,
  ordenarMetas,
  tituloSugerido,
  validarMeta,
  type Meta,
  type RascunhoDeMeta,
} from "@/features/goals/regras";

const base: RascunhoDeMeta = {
  titulo: "",
  tipo: "minutos",
  periodo: "semana",
  alvo: "5",
  trilhaId: null,
};

describe("validarMeta", () => {
  it("converte horas em minutos (aceita vírgula)", () => {
    expect(validarMeta(base)).toMatchObject({ ok: true, meta: { alvo: 300 } });
    expect(validarMeta({ ...base, alvo: "1,5" })).toMatchObject({ ok: true, meta: { alvo: 90 } });
    expect(validarMeta({ ...base, alvo: "0.25" })).toMatchObject({ ok: true, meta: { alvo: 15 } });
  });

  it("sem título, usa um título sugerido", () => {
    expect(validarMeta(base)).toMatchObject({
      ok: true,
      meta: { titulo: "5 h de foco por semana" },
    });
    expect(validarMeta({ ...base, tipo: "tarefas", periodo: "mes", alvo: "20" })).toMatchObject({
      ok: true,
      meta: { titulo: "20 tarefas por mês", alvo: 20 },
    });
  });

  it("mantém o título digitado (sem espaços nas pontas, no máximo 80)", () => {
    const r = validarMeta({ ...base, titulo: `  ${"x".repeat(100)}  ` });
    expect(r.ok && r.meta.titulo.length).toBe(80);
  });

  it.each([
    [{ alvo: "" }, "Digite as horas, por exemplo 5 ou 1,5."],
    [{ alvo: "abc" }, "Digite as horas, por exemplo 5 ou 1,5."],
    [{ alvo: "0" }, "A meta precisa ter pelo menos 15 minutos (0,25 h)."],
    [{ alvo: "0,1" }, "A meta precisa ter pelo menos 15 minutos (0,25 h)."],
    [{ tipo: "tarefas" as const, alvo: "2,5" }, "Digite um número inteiro de tarefas."],
    [{ tipo: "tarefas" as const, alvo: "0" }, "A meta precisa de pelo menos 1 tarefa."],
    [{ tipo: "tarefas" as const, alvo: "99999" }, "Meta grande demais."],
  ])("recusa %j", (mudanca, erro) => {
    expect(validarMeta({ ...base, ...mudanca })).toEqual({ ok: false, erros: { alvo: erro } });
  });
});

describe("tituloSugerido / descreverProgresso", () => {
  it("monta frases legíveis", () => {
    expect(tituloSugerido("minutos", "mes", "10")).toBe("10 h de foco por mês");
    expect(descreverProgresso({ tipo: "minutos", atual: 150, alvo: 300 })).toBe("2h30 de 5h");
    expect(descreverProgresso({ tipo: "tarefas", atual: 3, alvo: 1 })).toBe("3 de 1 tarefa");
    expect(descreverProgresso({ tipo: "tarefas", atual: 3, alvo: 10 })).toBe("3 de 10 tarefas");
  });
});

describe("ordenarMetas", () => {
  const m = (id: string, percentual: number): Meta => ({
    id,
    titulo: id,
    tipo: "minutos",
    periodo: "semana",
    alvo: 100,
    trilhaId: null,
    atual: percentual,
    percentual,
  });

  it("mais perto de bater primeiro; batidas por último", () => {
    expect(ordenarMetas([m("a", 100), m("b", 20), m("c", 80)]).map((x) => x.id)).toEqual([
      "c",
      "b",
      "a",
    ]);
  });
});
