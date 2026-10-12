/** Chaves do cache do TanStack Query, num lugar só (evita erro de digitação e cache "esquecido"). */
export const chaves = {
  perfil: ["perfil"] as const,
  trilhas: ["trilhas"] as const,
  tarefas: ["tarefas"] as const,
  diasDeFoco: ["foco", "dias"] as const,
  sequencia: ["foco", "sequencia"] as const,
  metas: ["metas"] as const,
  conexaoGoogle: ["google", "conexao"] as const,
  agendasGoogle: ["google", "agendas"] as const,
  eventosGoogle: ["google", "eventos"] as const,
  murais: ["murais"] as const,
  mural: (id: string) => ["murais", id] as const,
};
