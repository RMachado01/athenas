import { runInNewContext } from "node:vm";
import { describe, expect, it } from "vitest";
import { COOKIE_TEMA, ehOpcaoDeTema, scriptTemaInicial } from "@/lib/tema";

/**
 * Executa o script do <head> contra um "document" falso para provar que:
 *  - um cookie válido vira data-theme;
 *  - cookie ausente, inválido ou malicioso NÃO mexe no <html>;
 *  - erros nunca derrubam a página.
 */
function rodarScript(cookie: string) {
  const atributos: Record<string, string> = {};
  const document = {
    cookie,
    documentElement: {
      setAttribute: (nome: string, valor: string) => {
        atributos[nome] = valor;
      },
    },
  };
  runInNewContext(scriptTemaInicial(), { document });
  return atributos;
}

describe("scriptTemaInicial", () => {
  it.each(["ponderosa", "burgundy", "camel", "auto"])("aplica o tema %s do cookie", (tema) => {
    expect(rodarScript(`${COOKIE_TEMA}=${tema}`)).toEqual({ "data-theme": tema });
  });

  it("acha o cookie no meio de outros", () => {
    expect(rodarScript(`a=1; ${COOKIE_TEMA}=camel; b=2`)).toEqual({ "data-theme": "camel" });
  });

  it("não faz nada sem cookie", () => {
    expect(rodarScript("outro=1")).toEqual({});
  });

  it("ignora valores fora da lista (inclusive tentativa de injeção)", () => {
    expect(rodarScript(`${COOKIE_TEMA}=roxo`)).toEqual({});
    expect(rodarScript(`${COOKIE_TEMA}="><script>alert(1)</script>`)).toEqual({});
  });

  it("não quebra se document.cookie falhar", () => {
    const document = {
      get cookie(): string {
        throw new Error("bloqueado");
      },
      documentElement: { setAttribute: () => undefined },
    };
    expect(() => runInNewContext(scriptTemaInicial(), { document })).not.toThrow();
  });
});

describe("ehOpcaoDeTema", () => {
  it("valida somente as opções conhecidas", () => {
    expect(ehOpcaoDeTema("camel")).toBe(true);
    expect(ehOpcaoDeTema("auto")).toBe(true);
    expect(ehOpcaoDeTema("roxo")).toBe(false);
    expect(ehOpcaoDeTema(undefined)).toBe(false);
  });
});
