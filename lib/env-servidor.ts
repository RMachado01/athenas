import "server-only";

/**
 * Segredos que SÓ o servidor conhece (nunca "NEXT_PUBLIC_"). Ficam nas variáveis de ambiente
 * da Vercel, digitadas pela pessoa dona do projeto; nunca no código nem no Git.
 *
 *  - GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET: o cliente OAuth do Google (o mesmo do login).
 *  - SUPABASE_SECRET_KEY: chave secreta do Supabase (sb_secret_…), que ignora a RLS. Usada só
 *    para chamar as funções `gcal_*` (guardar/ler o token no Vault e gravar eventos importados).
 *
 * Sem elas, a integração com o Google Agenda simplesmente fica indisponível (o resto do app segue).
 */
export interface EnvGoogle {
  clientId: string;
  clientSecret: string;
  supabaseSecretKey: string;
}

export function lerEnvGoogle(): EnvGoogle | null {
  const clientId = process.env.GOOGLE_CLIENT_ID?.trim();
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET?.trim();
  const supabaseSecretKey = process.env.SUPABASE_SECRET_KEY?.trim();
  if (!clientId || !clientSecret || !supabaseSecretKey) return null;
  return { clientId, clientSecret, supabaseSecretKey };
}
