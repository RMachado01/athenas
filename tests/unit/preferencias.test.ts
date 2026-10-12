import { describe, expect, it } from "vitest";
import { CAMPOS_DE_ESTUDO, ehModoDeMovimento, validarCampoDeEstudo } from "@/lib/preferencias";

describe("validarCampoDeEstudo", () => {
  it("aceita números dentro dos limites (inclusive os extremos)", () => {
    expect(validarCampoDeEstudo("pomodoro_focus_min", "25")).toEqual({ ok: true, valor: 25 });
    expect(validarCampoDeEstudo("pomodoro_focus_min", "1")).toEqual({ ok: true, valor: 1 });
    expect(validarCampoDeEstudo("pomodoro_focus_min", " 180 ")).toEqual({ ok: true, valor: 180 });
    expect(validarCampoDeEstudo("pomodoro_cycle_length", "2")).toEqual({ ok: true, valor: 2 });
  });

  it("recusa fora dos limites com mensagem clara", () => {
    expect(validarCampoDeEstudo("pomodoro_focus_min", "0")).toEqual({
      ok: false,
      erro: "Use um valor entre 1 e 180.",
    });
    expect(validarCampoDeEstudo("daily_goal_min", "4")).toMatchObject({ ok: false });
    expect(validarCampoDeEstudo("pomodoro_cycle_length", "11")).toMatchObject({ ok: false });
  });

  it.each(["", "  ", "abc", "2.5", "2,5", "-3", "1e3", "12 3"])("recusa %j", (texto) => {
    expect(validarCampoDeEstudo("daily_goal_min", texto)).toEqual({
      ok: false,
      erro: "Digite um número inteiro.",
    });
  });

  it("os limites batem com os CHECKs do banco", () => {
    const limites = Object.fromEntries(CAMPOS_DE_ESTUDO.map((c) => [c.campo, [c.min, c.max]]));
    expect(limites).toEqual({
      daily_goal_min: [5, 1440],
      streak_min_min: [1, 1440],
      pomodoro_focus_min: [1, 180],
      pomodoro_break_min: [1, 60],
      pomodoro_long_break_min: [1, 120],
      pomodoro_cycle_length: [2, 10],
    });
  });
});

describe("ehModoDeMovimento", () => {
  it("só aceita os três modos do banco", () => {
    expect(["system", "full", "reduced"].every(ehModoDeMovimento)).toBe(true);
    expect(ehModoDeMovimento("tanto faz")).toBe(false);
    expect(ehModoDeMovimento(null)).toBe(false);
  });
});
