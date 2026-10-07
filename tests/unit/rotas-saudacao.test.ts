import { describe, expect, it } from "vitest";
import { destinoSeguro, rotaExigeLogin } from "@/lib/rotas";
import { primeiroNome, saudacao } from "@/lib/saudacao";

describe("rotaExigeLogin", () => {
  it.each(["/", "/tarefas", "/metas/novo", "/g/sql-do-zero", "/ajustes/privacidade"])(
    "%s exige login (protegido por padrão)",
    (caminho) => {
      expect(rotaExigeLogin(caminho)).toBe(true);
    },
  );

  it.each(["/login", "/auth/callback", "/dev/temas", "/termos", "/privacidade", "/regras"])(
    "%s é público",
    (caminho) => {
      expect(rotaExigeLogin(caminho)).toBe(false);
    },
  );

  it("não confunde prefixos parecidos (/loginx não é /login)", () => {
    expect(rotaExigeLogin("/loginx")).toBe(true);
    expect(rotaExigeLogin("/devops")).toBe(true);
  });
});

describe("destinoSeguro (anti open redirect)", () => {
  it("aceita caminhos internos", () => {
    expect(destinoSeguro("/tarefas")).toBe("/tarefas");
    expect(destinoSeguro("/g/sql?aba=mural")).toBe("/g/sql?aba=mural");
  });

  it.each([
    "https://malicioso.com",
    "//malicioso.com",
    "/\\malicioso.com",
    "javascript:alert(1)",
    "tarefas",
    "/ok\n/quebra",
  ])("rejeita %j e volta para a página inicial", (ruim) => {
    expect(destinoSeguro(ruim)).toBe("/");
  });

  it("sem valor volta para a página inicial", () => {
    expect(destinoSeguro(null)).toBe("/");
    expect(destinoSeguro(undefined)).toBe("/");
    expect(destinoSeguro("")).toBe("/");
  });
});

describe("saudacao (no fuso da pessoa)", () => {
  // 7/out/2026 12:00 UTC = 09:00 em São Paulo (UTC-3) = 21:00 em Tóquio (UTC+9)
  const meioDia = new Date("2026-10-07T12:00:00Z");

  it("bom dia pela manhã no fuso de São Paulo", () => {
    expect(saudacao(meioDia, "America/Sao_Paulo")).toBe("Bom dia");
  });

  it("boa noite no mesmo instante em Tóquio: o fuso da pessoa manda", () => {
    expect(saudacao(meioDia, "Asia/Tokyo")).toBe("Boa noite");
  });

  it("boa tarde", () => {
    expect(saudacao(new Date("2026-10-07T18:00:00Z"), "America/Sao_Paulo")).toBe("Boa tarde");
  });

  it("madrugada conta como boa noite", () => {
    expect(saudacao(new Date("2026-10-07T05:00:00Z"), "America/Sao_Paulo")).toBe("Boa noite");
  });

  it("fuso inválido não quebra: usa São Paulo", () => {
    expect(saudacao(meioDia, "Isso/Nao_Existe")).toBe("Bom dia");
  });
});

describe("primeiroNome", () => {
  it("pega só o primeiro nome", () => {
    expect(primeiroNome("Ana Silva Souza")).toBe("Ana");
    expect(primeiroNome("  Renan  ")).toBe("Renan");
  });

  it("nome vazio ou ausente vira 'estudante'", () => {
    expect(primeiroNome("")).toBe("estudante");
    expect(primeiroNome(null)).toBe("estudante");
    expect(primeiroNome(undefined)).toBe("estudante");
  });
});
