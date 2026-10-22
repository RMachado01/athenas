import { describe, expect, it } from "vitest";
import { ehNoite, reacoesDoPet, SINAIS_VAZIOS, type SinaisDoPet } from "@/features/pixel/reacoes";

/** Sinais "nada acontecendo" + o que o teste quiser mudar. */
const com = (mudanca: Partial<SinaisDoPet>): SinaisDoPet => ({ ...SINAIS_VAZIOS, ...mudanca });
const emotes = (s: SinaisDoPet) => reacoesDoPet(s).map((r) => r.emote);

describe("reacoesDoPet", () => {
  it("nada acontecendo = nenhuma reação", () => {
    expect(reacoesDoPet(SINAIS_VAZIOS)).toEqual([]);
  });

  it("E4: Pomodoro rodando = estudando junto", () => {
    const [r] = reacoesDoPet(com({ focoRodando: true }));
    expect(r).toMatchObject({ emote: "musica", texto: "estudando junto com você" });
  });

  it("E2: tarefas para hoje e atrasadas, com link para Tarefas (singular e plural)", () => {
    expect(reacoesDoPet(com({ tarefasHoje: 1 }))[0]).toMatchObject({
      emote: "exclamacao",
      texto: "1 tarefa para hoje",
      link: { href: "/tarefas", rotulo: "Ver tarefas" },
    });
    expect(reacoesDoPet(com({ tarefasHoje: 2, tarefasAtrasadas: 1 }))[0]!.texto).toBe(
      "2 tarefas para hoje e 1 atrasada",
    );
    expect(reacoesDoPet(com({ tarefasAtrasadas: 3 }))[0]!.texto).toBe("3 tarefas atrasadas");
  });

  it("E3: 3 ou mais dias sem vir à Sala = saudade (2 dias ainda não)", () => {
    expect(emotes(com({ diasSemVir: 2 }))).toEqual([]);
    expect(reacoesDoPet(com({ diasSemVir: 4 }))[0]).toMatchObject({
      emote: "interrogacao",
      texto: "que saudade! faz 4 dias que você não aparece",
    });
  });

  it("E5: meta do dia batida", () => {
    expect(emotes(com({ minutosHoje: 119, metaMin: 120 }))).toEqual([]);
    expect(reacoesDoPet(com({ minutosHoje: 120, metaMin: 120 }))[0]).toMatchObject({
      emote: "estrela",
      texto: "meta de hoje batida!",
    });
  });

  it("E6: estudou muito (1,5x a meta, mínimo 150 min) = hora de pausa, no lugar das estrelas", () => {
    expect(emotes(com({ minutosHoje: 140, metaMin: 60 }))).toEqual(["estrela"]); // < 150
    expect(emotes(com({ minutosHoje: 180, metaMin: 120 }))).toEqual(["gota"]);
    expect(reacoesDoPet(com({ minutosHoje: 180, metaMin: 120 }))[0]!.texto).toMatch(/pausa/);
  });

  it("E7: notas novas desde a última visita, com link para Notas", () => {
    expect(reacoesDoPet(com({ notasNovas: 2 }))[0]).toMatchObject({
      emote: "ideia",
      texto: "2 notas novas desde a última visita",
      link: { href: "/notas" },
    });
    expect(reacoesDoPet(com({ notasNovas: 1 }))[0]!.texto).toBe(
      "1 nota nova desde a última visita",
    );
  });

  it("E8: 2+ dias sem estudar convida para o Foco; de noite, avisa que é tarde", () => {
    expect(emotes(com({ diasSemEstudar: 1 }))).toEqual([]);
    expect(reacoesDoPet(com({ diasSemEstudar: 3 }))[0]).toMatchObject({
      emote: "zz",
      texto: "faz 3 dias sem estudar: bora um pouquinho?",
      link: { href: "/foco" },
    });
    expect(reacoesDoPet(com({ noite: true }))[0]).toMatchObject({
      emote: "zz",
      texto: "já é tarde… descanse também",
    });
    // Com as duas coisas, um recado só.
    expect(emotes(com({ noite: true, diasSemEstudar: 5 }))).toEqual(["zz"]);
  });

  it("ordem de prioridade: Pomodoro > tarefas > saudade > pausa/meta > notas > sono", () => {
    const tudo = com({
      focoRodando: true,
      tarefasHoje: 1,
      diasSemVir: 5,
      minutosHoje: 200,
      metaMin: 100,
      notasNovas: 1,
      noite: true,
    });
    expect(emotes(tudo)).toEqual(["musica", "exclamacao", "interrogacao", "gota", "ideia", "zz"]);
  });

  it("durante um Pomodoro não convida a estudar (já está estudando)", () => {
    expect(emotes(com({ focoRodando: true, diasSemEstudar: 4 }))).toEqual(["musica"]);
  });
});

describe("ehNoite", () => {
  it("das 22h às 5h59 no fuso da pessoa", () => {
    // São Paulo = UTC-3: 01:30Z = 22:30 · 08:59Z = 05:59 · 09:00Z = 06:00 · 15:00Z = 12:00
    const sp = "America/Sao_Paulo";
    expect(ehNoite(new Date("2026-10-22T01:30:00Z"), sp)).toBe(true);
    expect(ehNoite(new Date("2026-10-22T08:59:00Z"), sp)).toBe(true);
    expect(ehNoite(new Date("2026-10-22T09:00:00Z"), sp)).toBe(false);
    expect(ehNoite(new Date("2026-10-22T15:00:00Z"), sp)).toBe(false);
    // O mesmo instante é dia em Tóquio (UTC+9: 10:30).
    expect(ehNoite(new Date("2026-10-22T01:30:00Z"), "Asia/Tokyo")).toBe(false);
  });
});
