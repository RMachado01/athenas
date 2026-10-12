import type { NextRequest } from "next/server";
import { revogar } from "@/features/calendar/google/oauth";
import {
  contextoDaRequisicao,
  origemConfiavel,
  respostaJson,
} from "@/features/calendar/google/servidor";

/**
 * POST /api/google/desconectar — revoga o acesso no Google (melhor esforço) e apaga do nosso lado
 * o segredo do Vault, a conexão, as agendas e os eventos importados.
 */
export async function POST(request: NextRequest) {
  if (!origemConfiavel(request)) return respostaJson({ status: "erro" }, 403);
  const r = await contextoDaRequisicao();
  if (!r.ok) return respostaJson({ status: "erro" }, r.motivo === "sem_login" ? 401 : 400);
  const { admin, userId } = r.ctx;

  const { data: refresh } = await admin.rpc("gcal_ler_refresh_token", { p_user: userId });
  if (refresh) await revogar(fetch, refresh);

  const { error } = await admin.rpc("gcal_remover_conexao", { p_user: userId });
  if (error) return respostaJson({ status: "erro" }, 500);
  return respostaJson({ status: "ok" });
}
