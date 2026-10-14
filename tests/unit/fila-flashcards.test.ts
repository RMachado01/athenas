import { describe, expect, it } from "vitest";
import { estadoNovo, type EstadoDoCartao } from "@/features/flashcards/agendador";
import {
  inicioDoDiaNoFuso,
  montarFila,
  proximoDaFila,
  reinserir,
  trechosDeEstudo,
  type CartaoDaFila,
} from "@/features/flashcards/fila";

const agora = new Date("2026-10-12T15:00:00Z"); // 12:00 em São Paulo
const inicioDoDia = new Date("2026-10-12T03:00:00Z");

function c(id: string, estado: Partial<EstadoDoCartao> = {}): CartaoDaFila {
  return {
    id,
    frente: id,
    verso: "v",
    deckId: "d",
    noteId: null,
    estado: { ...estadoNovo(agora), ...estado },
  };
}
const min = (n: number) => new Date(agora.getTime() + n * 60_000).toISOString();

describe("inicioDoDiaNoFuso", () => {
  it("meia-noite de São Paulo em UTC", () => {
    expect(inicioDoDiaNoFuso("America/Sao_Paulo", agora).toISOString()).toBe(
      "2026-10-12T03:00:00.000Z",
    );
  });
  it("23h30 em São Paulo ainda é o mesmo dia (02h30 UTC do dia seguinte)", () => {
    expect(
      inicioDoDiaNoFuso("America/Sao_Paulo", new Date("2026-10-13T02:30:00Z")).toISOString(),
    ).toBe("2026-10-12T03:00:00.000Z");
  });
  it("fuso inválido cai em São Paulo", () => {
    expect(inicioDoDiaNoFuso("Lugar/Nenhum", agora).toISOString()).toBe("2026-10-12T03:00:00.000Z");
  });
});

describe("montarFila", () => {
  it("ordem: aprendendo vencidos → revisões → novos até o limite", () => {
    const r = montarFila({
      revisoes: [c("rev", { state: 2, due: min(-60) }), c("apr", { state: 1, due: min(-1) })],
      novos: [c("n1"), c("n2"), c("n3")],
      agora,
      inicioDoDia,
      novosJaHoje: 8,
      limiteDeNovos: 10,
    });
    expect(r.fila.map((x) => x.id)).toEqual(["apr", "rev", "n1", "n2"]);
    expect(r.novosPausados).toBe(false);
  });

  it("aprendizagem que vence em até 20 min entra; depois disso, não", () => {
    const r = montarFila({
      revisoes: [c("logo", { state: 1, due: min(15) }), c("tarde", { state: 3, due: min(40) })],
      novos: [],
      agora,
      inicioDoDia,
      novosJaHoje: 0,
      limiteDeNovos: 10,
    });
    expect(r.fila.map((x) => x.id)).toEqual(["logo"]);
  });

  it("mais de 50 atrasados pausa os novos", () => {
    const atrasados = Array.from({ length: 51 }, (_, i) =>
      c(`a${i}`, { state: 2, due: "2026-10-01T12:00:00Z" }),
    );
    const r = montarFila({
      revisoes: atrasados,
      novos: [c("n")],
      agora,
      inicioDoDia,
      novosJaHoje: 0,
      limiteDeNovos: 10,
    });
    expect(r.atrasados).toBe(51);
    expect(r.novosPausados).toBe(true);
    expect(r.fila.some((x) => x.id === "n")).toBe(false);
  });

  it("limite zero ou já atingido: nenhum novo", () => {
    const r = montarFila({
      revisoes: [],
      novos: [c("n")],
      agora,
      inicioDoDia,
      novosJaHoje: 10,
      limiteDeNovos: 10,
    });
    expect(r.fila).toEqual([]);
  });
});

describe("proximoDaFila e reinserir", () => {
  it("pega o primeiro vencido; se nenhum venceu, antecipa o que vence em até 20 min", () => {
    expect(proximoDaFila([c("a", { state: 1, due: min(5) })], agora)?.id).toBe("a");
    expect(proximoDaFila([c("b", { state: 1, due: min(30) })], agora)).toBeNull();
    expect(proximoDaFila([], agora)).toBeNull();
  });

  it("cartão em aprendizagem volta para a fila na posição do vencimento", () => {
    const fila = [c("x", { state: 2, due: min(-5) }), c("y")];
    const voltou = c("apr", { state: 1, due: min(10) });
    expect(reinserir(fila, voltou, agora).map((x) => x.id)).toEqual(["x", "y", "apr"]);
  });

  it("cartão que só vence daqui a dias não volta", () => {
    const fila = [c("x")];
    expect(
      reinserir(fila, c("rev", { state: 2, due: min(60 * 24 * 3) }), agora).map((x) => x.id),
    ).toEqual(["x"]);
  });
});

describe("trechosDeEstudo", () => {
  const t = (minutos: number) => new Date(agora.getTime() + minutos * 60_000);
  it("um trecho contínuo", () => {
    expect(trechosDeEstudo([t(0), t(1), t(3), t(4)])).toEqual([{ inicio: t(0), fim: t(4) }]);
  });
  it("pausa de mais de 5 min corta; trecho com menos de 1 min é descartado", () => {
    expect(trechosDeEstudo([t(0), t(2), t(10), t(10.5), t(30), t(33)])).toEqual([
      { inicio: t(0), fim: t(2) },
      { inicio: t(30), fim: t(33) },
    ]);
  });
  it("vazio ou um momento só: nada", () => {
    expect(trechosDeEstudo([])).toEqual([]);
    expect(trechosDeEstudo([t(0)])).toEqual([]);
  });
});
