import { describe, expect, it } from "vitest";
import {
  distribuirEmColunas,
  eventoNoDia,
  formatarHora,
  haQuantoTempo,
  intervaloNoDia,
  noFuso,
  type EventoDaAgenda,
} from "@/features/calendar/dia";

const SP = "America/Sao_Paulo";
const comHorario = (id: string, inicio: string, fim: string): EventoDaAgenda => ({
  id,
  titulo: id,
  agendaId: "p",
  diaInteiro: false,
  inicio,
  fim,
  diaInicio: null,
  diaFim: null,
});

describe("noFuso", () => {
  it("converte UTC para a data e os minutos locais", () => {
    expect(noFuso("2026-10-12T12:30:00Z", SP)).toEqual({ dia: "2026-10-12", minutos: 9 * 60 + 30 });
    // 01:00 UTC ainda é o dia anterior em São Paulo
    expect(noFuso("2026-10-13T01:00:00Z", SP)).toEqual({ dia: "2026-10-12", minutos: 22 * 60 });
  });
});

describe("eventoNoDia / intervaloNoDia", () => {
  it("evento que atravessa a meia-noite aparece nos dois dias, recortado", () => {
    const plantao = comHorario("plantao", "2026-10-12T23:00:00Z", "2026-10-13T11:00:00Z"); // 20h → 8h
    expect(eventoNoDia(plantao, "2026-10-12", SP)).toBe(true);
    expect(eventoNoDia(plantao, "2026-10-13", SP)).toBe(true);
    expect(intervaloNoDia(plantao, "2026-10-12", SP)).toEqual({ inicioMin: 20 * 60, fimMin: 1440 });
    expect(intervaloNoDia(plantao, "2026-10-13", SP)).toEqual({ inicioMin: 0, fimMin: 8 * 60 });
  });

  it("terminar exatamente à meia-noite não vaza para o dia seguinte", () => {
    const e = comHorario("e", "2026-10-13T01:00:00Z", "2026-10-13T03:00:00Z"); // 22h → 00h
    expect(eventoNoDia(e, "2026-10-13", SP)).toBe(false);
  });

  it("dia inteiro usa o fim exclusivo", () => {
    const e: EventoDaAgenda = {
      id: "d",
      titulo: "Viagem",
      agendaId: "p",
      diaInteiro: true,
      inicio: null,
      fim: null,
      diaInicio: "2026-10-12",
      diaFim: "2026-10-14",
    };
    expect(
      ["2026-10-11", "2026-10-12", "2026-10-13", "2026-10-14"].map((d) => eventoNoDia(e, d, SP)),
    ).toEqual([false, true, true, false]);
    expect(intervaloNoDia(e, "2026-10-12", SP)).toBeNull();
  });
});

describe("distribuirEmColunas", () => {
  const b = (id: string, ini: number, fim: number) => ({ item: id, inicioMin: ini, fimMin: fim });

  it("sem sobreposição: cada um ocupa a largura toda", () => {
    const r = distribuirEmColunas([b("a", 540, 600), b("b", 600, 660)]);
    expect(r.map((x) => [x.item, x.coluna, x.colunas])).toEqual([
      ["a", 0, 1],
      ["b", 0, 1],
    ]);
  });

  it("sobrepostos dividem a largura; o terceiro reaproveita a coluna livre", () => {
    const r = distribuirEmColunas([b("a", 540, 660), b("b", 570, 600), b("c", 610, 640)]);
    expect(Object.fromEntries(r.map((x) => [x.item, [x.coluna, x.colunas]]))).toEqual({
      a: [0, 2],
      b: [1, 2],
      c: [1, 2],
    });
  });

  it("eventos curtíssimos ganham altura mínima e contam como sobrepostos", () => {
    const r = distribuirEmColunas([b("a", 540, 545), b("b", 550, 600)]);
    expect(r.every((x) => x.colunas === 2)).toBe(true);
  });
});

describe("formatarHora / haQuantoTempo", () => {
  it("formata", () => {
    expect(formatarHora(570)).toBe("09:30");
    expect(formatarHora(1440)).toBe("00:00");
    const agora = new Date("2026-10-12T15:00:00Z");
    expect(haQuantoTempo(null, agora)).toBe("nunca");
    expect(haQuantoTempo("2026-10-12T14:59:30Z", agora)).toBe("agora há pouco");
    expect(haQuantoTempo("2026-10-12T14:58:00Z", agora)).toBe("há 2 min");
    expect(haQuantoTempo("2026-10-12T12:00:00Z", agora)).toBe("há 3 h");
    expect(haQuantoTempo("2026-10-11T12:00:00Z", agora)).toBe("ontem");
  });
});
