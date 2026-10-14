import { describe, expect, it } from "vitest";
import { ajustarDatas } from "@/features/tasks/datas";

/** Regra do "Começa em": início exige prazo e nunca vem depois dele (o banco também confere). */
describe("ajustarDatas", () => {
  const atual = { start_on: "2026-10-13", due_on: "2026-10-17" };

  it("sem mudança, mantém tudo", () => {
    expect(ajustarDatas(atual, {})).toEqual(atual);
  });

  it("tirar o prazo tira o início junto", () => {
    expect(ajustarDatas(atual, { due_on: null })).toEqual({ start_on: null, due_on: null });
  });

  it("início sem prazo é descartado", () => {
    expect(
      ajustarDatas({ start_on: null, due_on: null }, { start_on: "2026-10-13" }),
    ).toEqual({ start_on: null, due_on: null });
  });

  it("prazo antes do início puxa o início para o prazo", () => {
    expect(ajustarDatas(atual, { due_on: "2026-10-10" })).toEqual({
      start_on: "2026-10-10",
      due_on: "2026-10-10",
    });
  });

  it("início depois do prazo empurra o prazo para o início", () => {
    expect(ajustarDatas(atual, { start_on: "2026-10-20" })).toEqual({
      start_on: "2026-10-20",
      due_on: "2026-10-20",
    });
  });

  it("mover o período inteiro de uma vez (início e prazo juntos) vale como veio", () => {
    expect(ajustarDatas(atual, { start_on: "2026-10-20", due_on: "2026-10-24" })).toEqual({
      start_on: "2026-10-20",
      due_on: "2026-10-24",
    });
  });

  it("limpar só o início deixa o prazo", () => {
    expect(ajustarDatas(atual, { start_on: null })).toEqual({
      start_on: null,
      due_on: "2026-10-17",
    });
  });
});
