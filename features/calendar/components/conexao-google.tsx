"use client";

import { CalendarDays, Check } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { useEffect } from "react";
import { toast } from "sonner";
import { haQuantoTempo } from "../dia";
import {
  useAgendasGoogle,
  useAlternarAgenda,
  useConexaoGoogle,
  useDesconectarGoogle,
} from "../queries";

/** Mensagens para quando a pessoa volta da tela do Google (?google=…). */
const AVISOS: Record<string, { tipo: "erro" | "info"; texto: string }> = {
  cancelado: { tipo: "info", texto: "Conexão com o Google Agenda cancelada." },
  permissoes: {
    tipo: "erro",
    texto: "Para importar, marque as duas permissões de leitura na tela do Google.",
  },
  erro: { tipo: "erro", texto: "Não deu pra conectar ao Google Agenda. Tente de novo." },
  indisponivel: {
    tipo: "erro",
    texto: "A integração com o Google ainda não foi ativada neste ambiente.",
  },
};

/**
 * Seção "Google Agenda" da Personalização: conectar (só leitura), escolher quais agendas
 * importar e desconectar (apaga tudo que veio do Google).
 */
export function ConexaoGoogle() {
  const { data: conexao, isPending } = useConexaoGoogle();
  const conectado = conexao != null;
  const { data: agendas = [] } = useAgendasGoogle(conectado);
  const alternar = useAlternarAgenda();
  const desconectar = useDesconectarGoogle();

  const parametro = useSearchParams().get("google");
  useEffect(() => {
    const aviso = parametro ? AVISOS[parametro] : undefined;
    if (!aviso) return;
    // id fixo: o mesmo aviso nunca aparece duas vezes (o React pode rodar o efeito 2x em dev).
    if (aviso.tipo === "erro") toast.error(aviso.texto, { id: `google-${parametro}` });
    else toast(aviso.texto, { id: `google-${parametro}` });
  }, [parametro]);

  return (
    <section id="google" aria-labelledby="titulo-google" className="flex flex-col gap-3">
      <h2 id="titulo-google" className="text-heading-2">
        Google Agenda
      </h2>
      <div className="cartao flex flex-col gap-4 rounded-xl p-4">
        <div className="flex items-center gap-3">
          <span className="bg-brand-soft/60 grid size-10 shrink-0 place-items-center rounded-md">
            <CalendarDays className="text-accent size-5" aria-hidden />
          </span>
          <p className="text-body-sm min-w-0 flex-1">
            <span className="block font-semibold">
              {isPending
                ? "Carregando…"
                : !conectado
                  ? "Não conectado"
                  : conexao.status === "needs_reauth"
                    ? "Acesso expirado"
                    : "Conectado"}
            </span>
            <span className="text-ink-muted">
              {!conectado
                ? "Só leitura: o Athenas mostra seus eventos e não altera nada no Google."
                : conexao.status === "needs_reauth"
                  ? "Reconecte para voltar a importar."
                  : `Sincronizado ${haQuantoTempo(conexao.ultimaSincronizacao, new Date())}`}
            </span>
          </p>
        </div>

        {!isPending &&
          (!conectado || conexao.status === "needs_reauth" ? (
            <a
              href="/api/google/conectar"
              className="botao-primario min-h-12 content-center text-center font-semibold"
            >
              {conectado ? "Reconectar" : "Conectar Google Agenda"}
            </a>
          ) : null)}

        {conectado && agendas.length > 0 && (
          <div className="flex flex-col gap-1">
            <span className="text-ink-muted text-body-sm font-medium">Agendas para importar</span>
            <ul role="list" className="flex flex-col">
              {agendas.map((a) => (
                <li key={a.id}>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={a.importar}
                    onClick={() => alternar.mutate({ id: a.id, importar: !a.importar })}
                    className="flex min-h-12 w-full cursor-pointer items-center gap-3 rounded-md px-1 text-left"
                  >
                    <span
                      aria-hidden="true"
                      className="size-3 shrink-0 rounded-[4px]"
                      style={{ background: a.cor ?? "var(--accent)" }}
                    />
                    <span className="min-w-0 flex-1 truncate">
                      {a.nome}
                      {a.principal && <span className="text-ink-muted"> · principal</span>}
                    </span>
                    <span
                      aria-hidden="true"
                      className={`grid size-6 place-items-center rounded-md border ${
                        a.importar
                          ? "bg-accent text-on-accent border-transparent"
                          : "border-[var(--glass-border)]"
                      }`}
                    >
                      {a.importar && <Check className="size-4" strokeWidth={3} />}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}

        {conectado && (
          <button
            type="button"
            onClick={() => desconectar.mutate()}
            disabled={desconectar.isPending}
            className="text-danger text-body-sm min-h-11 cursor-pointer self-start font-semibold disabled:opacity-50"
          >
            Desconectar e apagar eventos importados
          </button>
        )}
      </div>
    </section>
  );
}
