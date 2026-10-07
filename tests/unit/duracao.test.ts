import { describe, expect, it } from "vitest";
import { formatarDuracao } from "@/lib/duracao";

describe("formatarDuracao", () => {
  it("mostra minutos quando é menos de 1 hora", () => {
    expect(formatarDuracao(45)).toBe("45 min");
  });

  it("mostra horas e minutos com 2 dígitos (valores do mockup do Dashboard)", () => {
    expect(formatarDuracao(200)).toBe("3h20");
    expect(formatarDuracao(460)).toBe("7h40");
  });

  it("completa o zero à esquerda dos minutos", () => {
    expect(formatarDuracao(125)).toBe("2h05");
    expect(formatarDuracao(120)).toBe("2h00");
  });

  it("arredonda minutos fracionados", () => {
    expect(formatarDuracao(59.6)).toBe("1h00");
  });

  it("não quebra com valores inválidos", () => {
    expect(formatarDuracao(-5)).toBe("0 min");
    expect(formatarDuracao(Number.NaN)).toBe("0 min");
  });
});
