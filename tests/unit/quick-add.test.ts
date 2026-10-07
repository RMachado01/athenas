import { describe, expect, it } from "vitest";
import { interpretarTarefaRapida as interpretar, somarDias } from "@/features/tasks/quick-add";

/**
 * "Hoje" fixo: quarta-feira, 7 de outubro de 2026 (a data do projeto).
 * Assim cada teste mostra exatamente o que a pessoa vê.
 */
const HOJE = "2026-10-07";
const ler = (texto: string) => interpretar(texto, HOJE);

describe("exemplo completo do design", () => {
  it('"5 exercícios de CTE amanhã 19h #sql !alta" vira tarefa estruturada', () => {
    const t = ler("5 exercícios de CTE amanhã 19h #sql !alta");
    expect(t).toMatchObject({
      titulo: "5 exercícios de CTE",
      prazo: "2026-10-08",
      hora: "19:00",
      trilha: "sql",
      prioridade: 3,
      estimativaMin: null,
    });
  });

  it("a ordem das partes não importa", () => {
    const t = ler("!alta #python pandas merge ~50min sábado 10h");
    expect(t).toMatchObject({
      titulo: "pandas merge",
      prazo: "2026-10-10",
      hora: "10:00",
      trilha: "python",
      prioridade: 3,
      estimativaMin: 50,
    });
  });

  it("texto sem nada especial vira só título", () => {
    const t = ler("Ler a documentação de OVER()");
    expect(t).toEqual({
      titulo: "Ler a documentação de OVER()",
      prazo: null,
      hora: null,
      trilha: null,
      prioridade: null,
      estimativaMin: null,
      trechos: [],
    });
  });
});

describe("prazo", () => {
  it.each([
    ["estudar hoje", "2026-10-07"],
    ["estudar amanhã", "2026-10-08"],
    ["estudar amanha", "2026-10-08"],
    ["estudar depois de amanhã", "2026-10-09"],
    ["estudar em 3 dias", "2026-10-10"],
    ["estudar em 1 dia", "2026-10-08"],
    ["estudar em 2 semanas", "2026-10-21"],
  ])("%s -> %s", (texto, esperado) => {
    expect(ler(texto).prazo).toBe(esperado);
  });

  it("'depois de amanhã' NÃO é lido como 'amanhã' e o título fica limpo", () => {
    const t = ler("revisar depois de amanhã");
    expect(t.prazo).toBe("2026-10-09");
    expect(t.titulo).toBe("revisar");
  });

  it("dia da semana = próxima ocorrência (nunca hoje)", () => {
    expect(ler("ler sexta").prazo).toBe("2026-10-09");
    expect(ler("ler quinta").prazo).toBe("2026-10-08");
    expect(ler("ler domingo").prazo).toBe("2026-10-11");
    expect(ler("ler segunda").prazo).toBe("2026-10-12");
    // Hoje é quarta: "quarta" significa a PRÓXIMA quarta.
    expect(ler("ler quarta").prazo).toBe("2026-10-14");
  });

  it("aceita acento e '-feira'", () => {
    expect(ler("ler terça-feira").prazo).toBe("2026-10-13");
    expect(ler("ler terca feira").prazo).toBe("2026-10-13");
    expect(ler("ler sábado").prazo).toBe("2026-10-10");
    expect(ler("ler terça-feira").titulo).toBe("ler");
  });

  it("'dia N': este mês se ainda não passou, senão o próximo", () => {
    expect(ler("pagar dia 15").prazo).toBe("2026-10-15");
    expect(ler("pagar dia 7").prazo).toBe("2026-10-07");
    expect(ler("pagar dia 3").prazo).toBe("2026-11-03");
    expect(ler("pagar dia 31").prazo).toBe("2026-10-31");
  });

  it("'dia N' num mês em que o dia não existe pula para o primeiro mês em que existe", () => {
    expect(interpretar("pagar dia 31", "2026-11-07").prazo).toBe("2026-12-31"); // novembro só tem 30
    expect(interpretar("pagar dia 31", "2026-01-31").prazo).toBe("2026-01-31"); // hoje é dia 31
    expect(interpretar("pagar dia 30", "2026-02-10").prazo).toBe("2026-03-30"); // fevereiro não tem 30
    expect(interpretar("pagar dia 29", "2026-02-10").prazo).toBe("2026-03-29"); // 2026 não é bissexto
    expect(interpretar("pagar dia 29", "2028-02-10").prazo).toBe("2028-02-29"); // 2028 é
  });

  it("'dia' impossível (dia 32, dia 0) é ignorado e fica no título", () => {
    const t = ler("pagar dia 32");
    expect(t.prazo).toBeNull();
    expect(t.titulo).toBe("pagar dia 32");
    expect(ler("pagar dia 0").prazo).toBeNull();
  });

  it("data dd/mm: a próxima vez que acontece", () => {
    expect(ler("prova 15/10").prazo).toBe("2026-10-15");
    expect(ler("prova 05/10").prazo).toBe("2027-10-05"); // já passou este ano
    expect(ler("prova 7/10").prazo).toBe("2026-10-07");
  });

  it("data completa dd/mm/aaaa", () => {
    expect(ler("prova 15/10/2026").prazo).toBe("2026-10-15");
    expect(ler("prova 01/01/2027").prazo).toBe("2027-01-01");
    expect(ler("prova 15/10/2026").titulo).toBe("prova");
  });

  it("data inexistente é ignorada", () => {
    const t = ler("prova 31/02");
    expect(t.prazo).toBeNull();
    expect(t.titulo).toBe("prova 31/02");
  });

  it("virada de ano e mês no cálculo de dias", () => {
    expect(interpretar("x amanhã", "2026-12-31").prazo).toBe("2027-01-01");
    expect(interpretar("x em 3 dias", "2026-02-27").prazo).toBe("2026-03-02");
    expect(interpretar("x amanhã", "2028-02-28").prazo).toBe("2028-02-29"); // ano bissexto
  });

  it("só a PRIMEIRA expressão de prazo vale; a outra continua no título", () => {
    const t = ler("amanhã ou sexta");
    expect(t.prazo).toBe("2026-10-08");
    expect(t.titulo).toBe("ou sexta");
  });
});

describe("hora", () => {
  it.each([
    ["estudar amanhã 19h", "19:00"],
    ["estudar amanhã 19h30", "19:30"],
    ["estudar amanhã 19:30", "19:30"],
    ["estudar amanhã às 8", "08:00"],
    ["estudar amanhã as 8:15", "08:15"],
    ["estudar amanhã 0h", "00:00"],
  ])("%s -> %s", (texto, esperado) => {
    expect(ler(texto).hora).toBe(esperado);
  });

  it("hora sem dia assume HOJE (tarefa nunca fica com hora sem data)", () => {
    const t = ler("estudar 21h");
    expect(t.hora).toBe("21:00");
    expect(t.prazo).toBe("2026-10-07");
    expect(t.titulo).toBe("estudar");
  });

  it("hora inválida é ignorada", () => {
    expect(ler("estudar 25h").hora).toBeNull();
    expect(ler("estudar 12:75").hora).toBeNull();
    expect(ler("estudar 25h").titulo).toBe("estudar 25h");
  });

  it("não confunde frases comuns com hora ('a 5 capítulos', '5 exercícios')", () => {
    const t = ler("estudar a 5 capítulos de SQL");
    expect(t.hora).toBeNull();
    expect(t.titulo).toBe("estudar a 5 capítulos de SQL");
    expect(ler("5 exercícios de CTE").hora).toBeNull();
  });
});

describe("trilha, prioridade e estimativa", () => {
  it("trilha: #nome, com hífen vira espaço, com acento", () => {
    expect(ler("x #sql").trilha).toBe("sql");
    expect(ler("x #power-bi").trilha).toBe("power bi");
    expect(ler("x #inglês").trilha).toBe("inglês");
    expect(ler("x #git_dbt").trilha).toBe("git dbt");
  });

  it("prioridade por palavra ou número, com ou sem acento", () => {
    expect(ler("x !alta").prioridade).toBe(3);
    expect(ler("x !media").prioridade).toBe(2);
    expect(ler("x !média").prioridade).toBe(2);
    expect(ler("x !baixa").prioridade).toBe(1);
    expect(ler("x !3").prioridade).toBe(3);
    expect(ler("x !1").prioridade).toBe(1);
  });

  it("'!' solto ou palavra desconhecida não vira prioridade", () => {
    expect(ler("incrível!").prioridade).toBeNull();
    expect(ler("x !urgente").prioridade).toBeNull();
    expect(ler("x !urgente").titulo).toBe("x !urgente");
  });

  it.each([
    ["x ~45min", 45],
    ["x ~45m", 45],
    ["x ~2h", 120],
    ["x ~1h30", 90],
    ["x ~1h 30min", 90],
    ["x ~ 20 min", 20],
  ])("estimativa %s -> %s min", (texto, esperado) => {
    expect(ler(texto).estimativaMin).toBe(esperado);
  });

  it("'~1h30' é estimativa e NÃO vira hora (a hora usa o formato sem til)", () => {
    const t = ler("x ~1h30 amanhã 19h");
    expect(t.estimativaMin).toBe(90);
    expect(t.hora).toBe("19:00");
    expect(t.titulo).toBe("x");
  });

  it("sem til, '45min' fica no título", () => {
    const t = ler("estudar 45min");
    expect(t.estimativaMin).toBeNull();
    expect(t.titulo).toBe("estudar 45min");
  });
});

describe("trechos (para destacar na tela)", () => {
  it("cada trecho aponta para o texto exato e vem em ordem", () => {
    const entrada = "5 exercícios de CTE amanhã 19h #sql !alta";
    const t = ler(entrada);
    for (const tr of t.trechos) expect(entrada.slice(tr.inicio, tr.fim)).toBe(tr.texto);
    expect(t.trechos.map((x) => [x.tipo, x.texto])).toEqual([
      ["prazo", "amanhã"],
      ["hora", "19h"],
      ["trilha", "#sql"],
      ["prioridade", "!alta"],
    ]);
  });
});

describe("casos de borda", () => {
  it("só marcações: título vazio (a tela não deixa salvar)", () => {
    const t = ler("amanhã #sql !alta");
    expect(t.titulo).toBe("");
    expect(t.trilha).toBe("sql");
  });

  it("entrada vazia ou só espaços", () => {
    expect(ler("").titulo).toBe("");
    expect(ler("   ").titulo).toBe("");
  });

  it("espaços extras são normalizados", () => {
    expect(ler("  ler    capítulo   2   amanhã  ").titulo).toBe("ler capítulo 2");
  });

  it("palavras que CONTÊM um dia da semana não casam ('sextante', 'segundo')", () => {
    expect(ler("ler sextante").prazo).toBeNull();
    expect(ler("o segundo capítulo").prazo).toBeNull();
    expect(ler("hojeamanhã").prazo).toBeNull();
  });

  it("letras maiúsculas e acentos mistos", () => {
    expect(ler("Estudar AMANHÃ às 9H #SQL !ALTA").prazo).toBe("2026-10-08");
    expect(ler("Estudar AMANHÃ às 9H #SQL !ALTA").prioridade).toBe(3);
  });
});

describe("somarDias", () => {
  it("soma e subtrai atravessando meses e anos", () => {
    expect(somarDias("2026-10-07", 1)).toBe("2026-10-08");
    expect(somarDias("2026-12-31", 1)).toBe("2027-01-01");
    expect(somarDias("2026-03-01", -1)).toBe("2026-02-28");
    expect(somarDias("2026-10-07", 0)).toBe("2026-10-07");
  });
});
