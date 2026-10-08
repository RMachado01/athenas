import { describe, expect, it } from "vitest";
import {
  barrasDaSemana,
  formatarMinutos,
  gradeDeCalor,
  minutosDoDia,
  nivelDeCalor,
  totalDaSemana,
  type DiaDeFoco,
} from "@/features/focus/resumos";

// 2026-10-07 é quarta-feira; a semana vai de seg 05/10 a dom 11/10.
const HOJE = "2026-10-07";
const dias: DiaDeFoco[] = [
  { dia: "2026-10-05", minutos: 60, sessoes: 2 },
  { dia: "2026-10-07", minutos: 30, sessoes: 1 },
  { dia: "2026-09-30", minutos: 240, sessoes: 8 },
];

describe("nivelDeCalor", () => {
  it("escala relativa à meta diária", () => {
    expect(nivelDeCalor(0, 120)).toBe(0);
    expect(nivelDeCalor(10, 120)).toBe(1);
    expect(nivelDeCalor(40, 120)).toBe(2);
    expect(nivelDeCalor(90, 120)).toBe(3);
    expect(nivelDeCalor(120, 120)).toBe(4);
    expect(nivelDeCalor(500, 120)).toBe(4);
  });
  it("meta inválida não quebra", () => {
    expect(nivelDeCalor(5, 0)).toBe(4);
  });
});

describe("gradeDeCalor", () => {
  const grade = gradeDeCalor(dias, HOJE, 120, 4);

  it("tem N colunas de 7 dias, de segunda a domingo, terminando na semana de hoje", () => {
    expect(grade).toHaveLength(4);
    expect(grade.every((c) => c.length === 7)).toBe(true);
    expect(grade[3]![0]!.dia).toBe("2026-10-05");
    expect(grade[3]![6]!.dia).toBe("2026-10-11");
    expect(grade[0]![0]!.dia).toBe("2026-09-14");
  });

  it("preenche minutos e níveis e marca o futuro", () => {
    const segunda = grade[3]![0]!;
    expect(segunda).toMatchObject({ minutos: 60, nivel: 3, futuro: false });
    expect(grade[3]![3]).toMatchObject({ dia: "2026-10-08", minutos: 0, futuro: true });
    expect(grade[2]![2]).toMatchObject({ dia: "2026-09-30", minutos: 240, nivel: 4 });
  });
});

describe("barrasDaSemana / totalDaSemana", () => {
  it("7 barras da semana de hoje", () => {
    const b = barrasDaSemana(dias, HOJE);
    expect(b.map((x) => x.minutos)).toEqual([60, 0, 30, 0, 0, 0, 0]);
    expect(b[2]!.hoje).toBe(true);
    expect(b[3]!.futuro).toBe(true);
  });
  it("total ignora outras semanas", () => {
    expect(totalDaSemana(dias, HOJE)).toBe(90);
  });
});

describe("minutosDoDia / formatarMinutos", () => {
  it("lê o dia ou devolve zero", () => {
    expect(minutosDoDia(dias, "2026-10-07")).toBe(30);
    expect(minutosDoDia(dias, "2026-10-01")).toBe(0);
  });
  it("formata", () => {
    expect(formatarMinutos(0)).toBe("0 min");
    expect(formatarMinutos(45)).toBe("45 min");
    expect(formatarMinutos(60)).toBe("1h");
    expect(formatarMinutos(150)).toBe("2h30");
    expect(formatarMinutos(125)).toBe("2h05");
  });
});
