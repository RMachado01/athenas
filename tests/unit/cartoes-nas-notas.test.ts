import { garantirIdsDeCartao, limparIdsColados } from "@/features/notes/components/cartoes-na-nota";
import { describe, expect, it } from "vitest";
import { extrairCartoes, separarCartao, type NoDoDocumento } from "@/features/notes/documento";

const p = (texto: string, cardId?: string): NoDoDocumento => ({
  type: "paragraph",
  attrs: cardId ? { cardId } : {},
  content: [{ type: "text", text: texto }],
});
const doc = (...content: NoDoDocumento[]): NoDoDocumento => ({ type: "doc", content });

describe("separarCartao", () => {
  it("divide no primeiro :: e apara os lados", () => {
    expect(separarCartao([{ texto: "  O que é JOIN? :: Une tabelas ", codigo: false }])).toEqual({
      frente: "O que é JOIN?",
      verso: "Une tabelas",
    });
  });

  it("verso pode conter :: depois do primeiro", () => {
    expect(separarCartao([{ texto: "a :: b :: c", codigo: false }])).toEqual({
      frente: "a",
      verso: "b :: c",
    });
  });

  it("ignora :: dentro de código inline", () => {
    expect(
      separarCartao([
        { texto: "Use ", codigo: false },
        { texto: "std::vector", codigo: true },
        { texto: " para listas", codigo: false },
      ]),
    ).toBeNull();
  });

  it("código inline pode estar na frente de um cartão de verdade", () => {
    expect(
      separarCartao([
        { texto: "O que faz ", codigo: false },
        { texto: "a::b", codigo: true },
        { texto: "? :: Acessa b", codigo: false },
      ]),
    ).toEqual({ frente: "O que faz a::b?", verso: "Acessa b" });
  });

  it("::: (reservado para ida e volta) não vira cartão nesta versão", () => {
    expect(separarCartao([{ texto: "cão ::: dog", codigo: false }])).toBeNull();
  });

  it("lado vazio ou maior que 2000 não vira cartão", () => {
    expect(separarCartao([{ texto: ":: só verso", codigo: false }])).toBeNull();
    expect(separarCartao([{ texto: "só frente ::   ", codigo: false }])).toBeNull();
    expect(separarCartao([{ texto: `${"x".repeat(2001)} :: v`, codigo: false }])).toBeNull();
  });
});

describe("extrairCartoes", () => {
  it("acha parágrafos com id, inclusive dentro de listas", () => {
    const d = doc(p("Texto comum"), p("Pergunta 1 :: Resposta 1", "c1"), {
      type: "bulletList",
      content: [{ type: "listItem", content: [p("P2 :: R2", "c2")] }],
    });
    expect(extrairCartoes(d)).toEqual([
      { id: "c1", frente: "Pergunta 1", verso: "Resposta 1" },
      { id: "c2", frente: "P2", verso: "R2" },
    ]);
  });

  it("parágrafo-cartão sem id ainda não entra (o editor dá o id antes de salvar)", () => {
    expect(extrairCartoes(doc(p("P :: R")))).toEqual([]);
  });

  it("id repetido (parágrafo colado) entra uma vez só", () => {
    expect(extrairCartoes(doc(p("A :: 1", "x"), p("B :: 2", "x")))).toEqual([
      { id: "x", frente: "A", verso: "1" },
    ]);
  });

  it("bloco de código nunca vira cartão", () => {
    const bloco: NoDoDocumento = {
      type: "codeBlock",
      content: [{ type: "text", text: "a :: b" }],
    };
    expect(extrairCartoes(doc(bloco))).toEqual([]);
  });

  it("quebra de linha vira \\n no texto do cartão", () => {
    const comQuebra: NoDoDocumento = {
      type: "paragraph",
      attrs: { cardId: "q" },
      content: [
        { type: "text", text: "Linha 1" },
        { type: "hardBreak" },
        { type: "text", text: "linha 2 :: R" },
      ],
    };
    expect(extrairCartoes(doc(comQuebra))).toEqual([
      { id: "q", frente: "Linha 1\nlinha 2", verso: "R" },
    ]);
  });

  it("código inline marcado no documento é respeitado", () => {
    const comCodigo: NoDoDocumento = {
      type: "paragraph",
      attrs: { cardId: "k" },
      content: [{ type: "text", text: "std::vector", marks: [{ type: "code" }] } as NoDoDocumento],
    };
    expect(extrairCartoes(doc(comCodigo))).toEqual([]);
  });
});

describe("garantirIdsDeCartao", () => {
  let n = 0;
  const novoId = () => `novo-${++n}`;

  it("dá id a cartão sem id e troca id repetido (parágrafo colado)", () => {
    n = 0;
    expect(
      garantirIdsDeCartao(
        [
          { pos: 0, id: null, ehCartao: true },
          { pos: 10, id: "a", ehCartao: true },
          { pos: 20, id: "a", ehCartao: true },
          { pos: 30, id: null, ehCartao: false },
        ],
        novoId,
      ),
    ).toEqual([
      { pos: 0, id: "novo-1" },
      { pos: 20, id: "novo-2" },
    ]);
  });

  it("parágrafo comum com id antigo mantém o id (se voltar a ser cartão, recupera o histórico)", () => {
    expect(garantirIdsDeCartao([{ pos: 0, id: "velho", ehCartao: false }], novoId)).toEqual([]);
  });
});

describe("garantirIdsDeCartao — Enter divide o parágrafo", () => {
  it("linha vazia de cima herda o id: o CARTÃO fica com ele e a linha vazia perde", () => {
    expect(
      garantirIdsDeCartao(
        [
          { pos: 0, id: "x", ehCartao: false },
          { pos: 2, id: "x", ehCartao: true },
        ],
        () => "novo",
      ),
    ).toEqual([{ pos: 0, id: null }]);
  });
});

describe("cartão com [[link]]", () => {
  it("o link entra no texto do cartão com o nome da nota", () => {
    const comLink: NoDoDocumento = {
      type: "paragraph",
      attrs: { cardId: "w" },
      content: [
        { type: "text", text: "O que é " },
        { type: "wikilink", attrs: { id: "n1", label: "JOIN" } },
        { type: "text", text: "? :: Une tabelas" },
      ],
    };
    expect(extrairCartoes(doc(comLink))).toEqual([
      { id: "w", frente: "O que é JOIN?", verso: "Une tabelas" },
    ]);
  });
});

describe("limparIdsColados", () => {
  it("tira o id de cartão vindo de OUTRA nota (vira cartão novo aqui); mantém os desta nota", () => {
    const colado: NoDoDocumento[] = [
      p("De outra nota :: sim", "de-fora"),
      {
        type: "bulletList",
        content: [{ type: "listItem", content: [p("Daqui :: sim", "daqui")] }],
      },
    ];
    expect(limparIdsColados(colado, new Set(["daqui"]))).toEqual([
      p("De outra nota :: sim"),
      {
        type: "bulletList",
        content: [{ type: "listItem", content: [p("Daqui :: sim", "daqui")] }],
      },
    ]);
  });
});
