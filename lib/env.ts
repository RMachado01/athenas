import { z } from "zod";

/**
 * Variáveis de ambiente públicas do Supabase, validadas num lugar só.
 *
 * "NEXT_PUBLIC_" significa que o valor vai para o navegador. Isso é seguro AQUI porque:
 *  - a URL do projeto não é segredo;
 *  - a chave "publishable" (sb_publishable_…) é feita para ser pública: quem protege os dados
 *    é a RLS do banco (ADR-002), não o sigilo da chave.
 * Já a chave secreta (service_role) NUNCA entra neste arquivo nem no navegador.
 */
const esquema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.url({ error: "NEXT_PUBLIC_SUPABASE_URL ausente ou inválida" }),
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: z
    .string({ error: "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ausente" })
    .min(1, "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY vazia"),
});

export type EnvSupabase = z.infer<typeof esquema>;

/**
 * Lê e valida. As variáveis são citadas por extenso (e não via loop) de propósito:
 * o Next só troca `process.env.NEXT_PUBLIC_X` pelo valor no navegador quando o nome aparece literal.
 */
export function lerEnvSupabase(): EnvSupabase {
  const resultado = esquema.safeParse({
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  });

  if (!resultado.success) {
    const problemas = resultado.error.issues.map((i) => `- ${i.message}`).join("\n");
    throw new Error(
      `Configuração do Supabase incompleta. Copie .env.example para .env.local e preencha:\n${problemas}`,
    );
  }
  return resultado.data;
}
