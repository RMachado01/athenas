import { describe, expect, it } from "vitest";
import {
  lerAgruparPor,
  lerVisao,
  paraSalvarAgruparPor,
  paraSalvarVisao,
} from "@/features/tasks/visoes";

describe("preferência de visão no perfil", () => {
  it("sem nada salvo (ou com lixo) abre na Lista e agrupa por status", () => {
    expect(lerVisao({})).toBe("lista");
    expect(lerVisao({ visao_tarefas: 42 })).toBe("lista");
    expect(lerVisao({ visao_tarefas: "inexistente" })).toBe("lista");
    expect(lerAgruparPor({})).toBe("status");
    expect(lerAgruparPor({ quadro_agrupar: "xyz" })).toBe("status");
  });

  it("lê o valor salvo", () => {
    expect(lerVisao({ visao_tarefas: "quadro" })).toBe("quadro");
    expect(lerVisao({ visao_tarefas: "calendario" })).toBe("calendario");
    expect(lerAgruparPor({ quadro_agrupar: "trilha" })).toBe("trilha");
    expect(lerAgruparPor({ quadro_agrupar: "prioridade" })).toBe("prioridade");
  });

  it("o que se grava é o que se lê de volta", () => {
    expect(lerVisao(paraSalvarVisao("mural"))).toBe("mural");
    expect(lerAgruparPor(paraSalvarAgruparPor("trilha"))).toBe("trilha");
  });
});
