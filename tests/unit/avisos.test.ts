import { describe, expect, it } from "vitest";
import { DURACAO_COM_ACAO } from "@/lib/avisos";

describe("duração dos avisos", () => {
  it("aviso com botão (Desfazer) dura 6 s, mais que o padrão de 4 s do Toaster", () => {
    expect(DURACAO_COM_ACAO).toBe(6000);
    expect(DURACAO_COM_ACAO).toBeGreaterThan(4000);
  });
});
