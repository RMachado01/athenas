import type { NextRequest } from "next/server";
import { criarClienteGoogle, ErroGoogle } from "@/features/calendar/google/api";
import { ErroOAuth, renovarAcesso } from "@/features/calendar/google/oauth";
import {
  atualizarAgendas,
  contextoDaRequisicao,
  origemConfiavel,
  repositorio,
  respostaJson,
} from "@/features/calendar/google/servidor";
import { sincronizarAgenda, type ResultadoDaAgenda } from "@/features/calendar/google/sincronizar";

/**
 * POST /api/google/sincronizar — importa do Google o que mudou (a tela chama ao abrir a Agenda).
 *
 * Respostas: { status: "ok" | "desconectado" | "needs_reauth" | "nao_configurado" | "erro" }.
 * Agendas desligadas pela pessoa têm os eventos apagados (não guardamos o que ela não quer ver).
 */
export async function POST(request: NextRequest) {
  if (!origemConfiavel(request)) return respostaJson({ status: "erro" }, 403);
  const r = await contextoDaRequisicao();
  if (!r.ok) {
    return r.motivo === "sem_login"
      ? respostaJson({ status: "erro" }, 401)
      : respostaJson({ status: "nao_configurado" });
  }
  const { env, admin, userId } = r.ctx;

  const { data: refresh, error: erroLeitura } = await admin.rpc("gcal_ler_refresh_token", {
    p_user: userId,
  });
  if (erroLeitura) return respostaJson({ status: "erro" }, 500);
  if (!refresh) return respostaJson({ status: "desconectado" });

  const marcar = (status: "active" | "needs_reauth", erro: string | null) =>
    admin.rpc("gcal_marcar_conexao", { p_user: userId, p_status: status, p_erro: erro });

  try {
    const accessToken = await renovarAcesso(fetch, {
      refreshToken: refresh,
      clientId: env.clientId,
      clientSecret: env.clientSecret,
    });
    const cliente = criarClienteGoogle(fetch);
    await atualizarAgendas(admin, userId, await cliente.listarAgendas(accessToken));

    const { data: agendas, error } = await admin
      .from("google_calendars")
      .select("google_calendar_id, enabled, sync_token")
      .eq("user_id", userId);
    if (error) throw error;

    const repo = repositorio(admin, userId);
    const resultados: ResultadoDaAgenda[] = [];
    for (const a of agendas) {
      if (!a.enabled) {
        // Desligada: zera os eventos e o token (se ligar de novo, faz carga completa).
        if (a.sync_token !== null) {
          await repo.aplicarLote(a.google_calendar_id, [], [], null, true);
        }
        continue;
      }
      resultados.push(
        await sincronizarAgenda({
          cliente,
          repo,
          accessToken,
          agenda: { id: a.google_calendar_id, syncToken: a.sync_token },
          agora: new Date(),
        }),
      );
    }
    await marcar("active", null);
    return respostaJson({ status: "ok", resultados });
  } catch (erro) {
    if (erro instanceof ErroOAuth && erro.codigo === "invalid_grant") {
      await marcar("needs_reauth", "O acesso ao Google foi revogado ou expirou.");
      return respostaJson({ status: "needs_reauth" });
    }
    const mensagem =
      erro instanceof ErroGoogle
        ? `Google respondeu ${erro.status}`
        : erro instanceof Error
          ? erro.message
          : "erro desconhecido";
    await marcar("active", mensagem);
    console.error("[google/sincronizar]", mensagem);
    return respostaJson({ status: "erro" }, 502);
  }
}
