/**
 * Regras de rota ligadas a login. Funções puras (sem Next/Supabase) para serem testadas fácil.
 */

/**
 * Caminhos que NÃO exigem login. Todo o resto é protegido por padrão
 * (esquecer de listar uma página nova nunca a deixa exposta: o erro é "para o lado seguro").
 */
const PUBLICAS = ["/login", "/auth", "/dev", "/termos", "/privacidade", "/regras"];

export function rotaExigeLogin(caminho: string): boolean {
  return !PUBLICAS.some((p) => caminho === p || caminho.startsWith(`${p}/`));
}

/**
 * Valida o parâmetro ?next= do login para impedir "open redirect" (alguém montar um link que,
 * depois do login, joga a pessoa num site malicioso). Só aceita caminhos internos simples.
 */
export function destinoSeguro(next: string | null | undefined): string {
  if (!next) return "/";
  const interno = next.startsWith("/") && !next.startsWith("//") && !next.includes("\\");
  const semControle = !/[\u0000-\u001f]/.test(next);
  return interno && semControle ? next : "/";
}
