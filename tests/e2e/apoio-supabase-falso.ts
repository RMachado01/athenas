import type { Page, Route } from "@playwright/test";
import { calcularGrupo } from "../../features/tasks/datas";

/**
 * Supabase FALSO em memória para testar a interface no navegador sem rede e sem conta.
 *
 * Intercepta as chamadas HTTP que o supabase-js faz (API REST do PostgREST) e responde a partir
 * de um estado na memória do teste. Imita só o que o app usa: leituras (v_tasks, tracks,
 * v_track_progress, profiles) e escritas (insert/update/delete). Reproduz duas regras do banco
 * que a tela espera: o grupo (bucket) calculado no fuso e o completed_at mantido pelo status.
 * Regras de verdade do banco (RLS, FKs…) são testadas em tests/db com PGlite — não aqui.
 */

export interface LinhaDeTarefa {
  id: string;
  user_id: string;
  track_id: string | null;
  parent_id: string | null;
  title: string;
  notes: string;
  priority: number;
  status: string;
  due_on: string | null;
  due_time: string | null;
  estimate_min: number | null;
  completed_at: string | null;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface LinhaDeTrilha {
  id: string;
  name: string;
  monogram: string;
  sort_order: number;
}

export interface Requisicao {
  metodo: string;
  tabela: string;
  filtro: string;
  corpo: unknown;
}

export interface EstadoFalso {
  perfil: {
    id: string;
    display_name: string;
    timezone: string;
    appearance: Record<string, unknown>;
    theme: string;
    motion: string;
    daily_goal_min: number;
    streak_min_min: number;
    pomodoro_focus_min: number;
    pomodoro_break_min: number;
    pomodoro_long_break_min: number;
    pomodoro_cycle_length: number;
  };
  /** Dias de foco já somados (o que a view v_focus_days devolveria). */
  diasDeFoco: { dia: string; minutos: number; sessoes: number }[];
  sequencia: { atual: number; melhor: number };
  /** Murais: as linhas como estão no banco (boards, board_items, board_links). */
  murais: {
    boards: {
      id: string;
      title: string;
      color: string;
      icon: string;
      track_id: string | null;
      viewport: { x: number; y: number; zoom: number };
      archived_at: string | null;
      updated_at: string;
    }[];
    itens: {
      id: string;
      board_id: string;
      kind: string;
      x: number;
      y: number;
      w: number;
      h: number;
      z: number;
      color: string;
      text: string;
      task_id: string | null;
      parent_id: string | null;
    }[];
    ligacoes: { id: string; board_id: string; from_item: string; to_item: string; label: string }[];
  };
  /** Google Agenda: conexão (null = não conectado), agendas e eventos importados. */
  google: {
    conexao: { status: string; last_synced_at: string | null; last_error: string | null } | null;
    agendas: {
      google_calendar_id: string;
      summary: string;
      color: string | null;
      is_primary: boolean;
      enabled: boolean;
    }[];
    eventos: {
      id: string;
      google_calendar_id: string;
      title: string;
      all_day: boolean;
      starts_at: string | null;
      ends_at: string | null;
      start_date: string | null;
      end_date: string | null;
    }[];
  };
  /** Metas como a view v_goal_progress devolveria (o "atual" já calculado). */
  metas: {
    id: string;
    title: string;
    kind: string;
    period: string;
    target: number;
    track_id: string | null;
    atual: number;
    archived: boolean;
  }[];
  trilhas: LinhaDeTrilha[];
  tarefas: LinhaDeTarefa[];
  /** Atraso (ms) na leitura do perfil, para simular rede lenta (como no CI). */
  atrasoDoPerfilMs?: number;
  /** Quando true, TODA escrita responde 500 (para testar o desfazer-otimista). */
  falharEscritas: boolean;
  requisicoes: Requisicao[];
}

export const USUARIO = "00000000-0000-4000-8000-000000000001";

let sequencia = 0;
const novoId = () => `00000000-0000-4000-8000-${String(++sequencia).padStart(12, "0")}`;

export function trilha(nome: string, monograma = nome.slice(0, 1)): LinhaDeTrilha {
  return { id: novoId(), name: nome, monogram: monograma, sort_order: sequencia };
}

export function tarefa(campos: Partial<LinhaDeTarefa> & { title: string }): LinhaDeTarefa {
  const status = campos.status ?? "todo";
  return {
    id: novoId(),
    user_id: USUARIO,
    track_id: null,
    parent_id: null,
    notes: "",
    priority: 2,
    status,
    due_on: null,
    due_time: null,
    estimate_min: null,
    completed_at: status === "done" ? "2026-10-06T12:00:00Z" : null,
    sort_order: 0,
    created_at: `2026-10-01T00:00:${String(sequencia % 60).padStart(2, "0")}Z`,
    updated_at: "2026-10-01T00:00:00Z",
    ...campos,
  };
}

export function criarEstado(parcial: Partial<EstadoFalso> = {}): EstadoFalso {
  return {
    perfil: {
      id: USUARIO,
      display_name: "Teste",
      timezone: "America/Sao_Paulo",
      appearance: { trilhas_escolhidas: true },
      theme: "auto",
      motion: "system",
      daily_goal_min: 120,
      streak_min_min: 30,
      pomodoro_focus_min: 25,
      pomodoro_break_min: 5,
      pomodoro_long_break_min: 15,
      pomodoro_cycle_length: 4,
    },
    diasDeFoco: [],
    sequencia: { atual: 0, melhor: 0 },
    metas: [],
    google: { conexao: null, agendas: [], eventos: [] },
    murais: { boards: [], itens: [], ligacoes: [] },
    trilhas: [],
    tarefas: [],
    falharEscritas: false,
    requisicoes: [],
    ...parcial,
  };
}

const CORS = (cabecalhos: Record<string, string>) => ({
  "access-control-allow-origin": "*",
  "access-control-allow-methods": "GET,POST,PATCH,DELETE,OPTIONS",
  "access-control-allow-headers":
    cabecalhos["access-control-request-headers"] ??
    "authorization,apikey,content-type,accept,accept-profile,content-profile,prefer",
  "access-control-max-age": "600",
});

/**
 * Instala o falso na página. `hoje` ("AAAA-MM-DD") deve ser o mesmo dia fixado no relógio do
 * navegador (page.clock), para o grupo calculado aqui bater com o da tela.
 */
export async function instalarSupabaseFalso(page: Page, estado: EstadoFalso, hoje: string) {
  await page.route("**/auth/v1/**", (rota) =>
    rota.fulfill({ status: 401, contentType: "application/json", body: "{}" }),
  );

  await page.route("**/rest/v1/**", async (rota: Route) => {
    const req = rota.request();
    const url = new URL(req.url());
    const tabela = url.pathname.replace("/rest/v1/", "");
    const cors = CORS(req.headers());

    if (req.method() === "OPTIONS") {
      return rota.fulfill({ status: 204, headers: cors });
    }

    const json = (dados: unknown, status = 200) =>
      rota.fulfill({
        status,
        headers: { ...cors, "content-type": "application/json" },
        body: JSON.stringify(dados),
      });
    const semCorpo = (status = 204) => rota.fulfill({ status, headers: cors });

    const corpo: unknown = req.postData() ? JSON.parse(req.postData()!) : null;
    const filtro = url.searchParams.get("id") ?? "";
    estado.requisicoes.push({ metodo: req.method(), tabela, filtro, corpo });
    const idDoFiltro = filtro.startsWith("eq.") ? filtro.slice(3) : null;

    // ---------------- LEITURAS ----------------
    if (req.method() === "GET") {
      if (tabela === "v_tasks") {
        const linhas = estado.tarefas.map((t) => ({ ...t, bucket: calcularGrupo(t, hoje) }));
        return json(linhas);
      }
      if (tabela === "tracks") return json(estado.trilhas);
      if (tabela === "v_track_progress") {
        return json(
          estado.trilhas.map((tr) => {
            const raizes = estado.tarefas.filter((t) => t.track_id === tr.id && !t.parent_id);
            const feitas = raizes.filter((t) => t.status === "done").length;
            return {
              track_id: tr.id,
              total: raizes.length,
              concluidas: feitas,
              percentual: raizes.length ? Math.round((100 * feitas) / raizes.length) : 0,
            };
          }),
        );
      }
      if (tabela === "v_focus_days") return json(estado.diasDeFoco);
      if (tabela === "google_calendars") return json(estado.google.agendas);
      if (tabela === "v_boards") {
        return json(
          estado.murais.boards
            .filter((b) => !b.archived_at)
            .map((b) => ({
              ...b,
              itens: estado.murais.itens.filter((i) => i.board_id === b.id).length,
            })),
        );
      }
      if (tabela === "boards") {
        const b = estado.murais.boards.find((x) => x.id === idDoFiltro && !x.archived_at);
        const quer = req.headers()["accept"]?.includes("pgrst.object");
        if (quer) return b ? json(b) : json(null);
        return json(b ? [b] : []);
      }
      if (tabela === "board_items" || tabela === "board_links") {
        const mural = url.searchParams.get("board_id")?.replace(/^eq\./, "");
        const linhas = tabela === "board_items" ? estado.murais.itens : estado.murais.ligacoes;
        return json(linhas.filter((l) => l.board_id === mural));
      }
      if (tabela === "calendar_events") return json(estado.google.eventos);
      if (tabela === "v_goal_progress") {
        return json(
          estado.metas
            .filter((m) => !m.archived)
            .map((m) => ({
              ...m,
              percentual: Math.min(100, Math.round((100 * m.atual) / m.target)),
            })),
        );
      }
      if (tabela === "v_streak") {
        const quer1 = req.headers()["accept"]?.includes("pgrst.object");
        return json(quer1 ? estado.sequencia : [estado.sequencia]);
      }
      if (tabela === "profiles") {
        if (estado.atrasoDoPerfilMs)
          await new Promise((r) => setTimeout(r, estado.atrasoDoPerfilMs));
        const quer = req.headers()["accept"]?.includes("pgrst.object");
        return json(quer ? estado.perfil : [estado.perfil]);
      }
    }

    // Funções (RPC) de leitura chegam como POST em /rest/v1/rpc/<nome>.
    if (tabela === "rpc/minha_conexao_google") {
      const c = estado.google.conexao;
      return json(c ? [{ ...c, scopes: [] }] : []);
    }

    // ---------------- ESCRITAS ----------------
    if (estado.falharEscritas && req.method() !== "GET") {
      return json({ message: "falha simulada", code: "XX000" }, 500);
    }

    if (tabela === "tasks") {
      if (req.method() === "POST") {
        const novo = corpo as Partial<LinhaDeTarefa> & { title: string };
        const status = novo.status ?? "todo";
        estado.tarefas.push(
          tarefa({
            ...novo,
            status,
            completed_at: status === "done" ? new Date().toISOString() : null,
          }),
        );
        return semCorpo(201);
      }
      if (req.method() === "PATCH" && idDoFiltro) {
        const campos = corpo as Partial<LinhaDeTarefa>;
        estado.tarefas = estado.tarefas.map((t) => {
          if (t.id !== idDoFiltro) return t;
          const novo = { ...t, ...campos };
          // Regra do banco: completed_at acompanha o status.
          if (campos.status !== undefined) {
            novo.completed_at =
              campos.status === "done" ? (t.completed_at ?? new Date().toISOString()) : null;
          }
          return novo;
        });
        return semCorpo();
      }
      if (req.method() === "DELETE" && idDoFiltro) {
        // Cascata do banco: apagar a mãe apaga as subtarefas.
        estado.tarefas = estado.tarefas.filter(
          (t) => t.id !== idDoFiltro && t.parent_id !== idDoFiltro,
        );
        return semCorpo();
      }
    }

    if (tabela === "tracks" && req.method() === "POST") {
      const novas = (Array.isArray(corpo) ? corpo : [corpo]) as {
        name: string;
        monogram: string;
        sort_order?: number;
      }[];
      for (const n of novas) {
        estado.trilhas.push({
          id: novoId(),
          name: n.name,
          monogram: n.monogram,
          sort_order: n.sort_order ?? 0,
        });
      }
      return semCorpo(201);
    }

    // ---- murais ----
    if (tabela === "boards") {
      if (req.method() === "POST") {
        const b = corpo as {
          id: string;
          title: string;
          color: string;
          icon: string;
          track_id: string | null;
        };
        estado.murais.boards.push({
          ...b,
          viewport: { x: 0, y: 0, zoom: 1 },
          archived_at: null,
          updated_at: new Date().toISOString(),
        });
        return semCorpo(201);
      }
      if (req.method() === "PATCH" && idDoFiltro) {
        const campos = corpo as Record<string, unknown>;
        estado.murais.boards = estado.murais.boards.map((b) =>
          b.id === idDoFiltro ? { ...b, ...campos } : b,
        ) as typeof estado.murais.boards;
        return semCorpo();
      }
    }
    if (tabela === "board_items") {
      if (req.method() === "POST") {
        const novos = (Array.isArray(corpo) ? corpo : [corpo]) as Record<string, unknown>[];
        estado.murais.itens.push(
          ...novos.map(
            (n) =>
              ({
                text: "",
                task_id: null,
                parent_id: null,
                ...n,
              }) as (typeof estado.murais.itens)[number],
          ),
        );
        return semCorpo(201);
      }
      if (req.method() === "PATCH") {
        const ids = idDoFiltro
          ? [idDoFiltro]
          : (filtro
              .match(/^in\.\((.*)\)$/)?.[1]
              ?.split(",")
              .map((x) => x.replace(/"/g, "")) ?? []);
        const campos = corpo as Record<string, unknown>;
        estado.murais.itens = estado.murais.itens.map((i) =>
          ids.includes(i.id) ? { ...i, ...campos } : i,
        ) as typeof estado.murais.itens;
        return semCorpo();
      }
      if (req.method() === "DELETE" && idDoFiltro) {
        // Cascatas do banco: setas do item somem; filhos de um grupo ficam soltos.
        estado.murais.itens = estado.murais.itens
          .filter((i) => i.id !== idDoFiltro)
          .map((i) => (i.parent_id === idDoFiltro ? { ...i, parent_id: null } : i));
        estado.murais.ligacoes = estado.murais.ligacoes.filter(
          (l) => l.from_item !== idDoFiltro && l.to_item !== idDoFiltro,
        );
        return semCorpo();
      }
    }
    if (tabela === "board_links") {
      if (req.method() === "POST") {
        const novos = (Array.isArray(corpo) ? corpo : [corpo]) as Record<string, unknown>[];
        estado.murais.ligacoes.push(
          ...novos.map((n) => ({ label: "", ...n }) as (typeof estado.murais.ligacoes)[number]),
        );
        return semCorpo(201);
      }
      if (req.method() === "DELETE" && idDoFiltro) {
        estado.murais.ligacoes = estado.murais.ligacoes.filter((l) => l.id !== idDoFiltro);
        return semCorpo();
      }
    }

    if (tabela === "google_calendars" && req.method() === "PATCH") {
      const id = url.searchParams.get("google_calendar_id")?.replace(/^eq\./, "");
      const campos = corpo as { enabled?: boolean };
      estado.google.agendas = estado.google.agendas.map((a) =>
        a.google_calendar_id === id ? { ...a, ...campos } : a,
      );
      return semCorpo();
    }

    if (tabela === "goals") {
      if (req.method() === "POST") {
        const g = corpo as {
          id: string;
          title: string;
          kind: string;
          period: string;
          target: number;
          track_id: string | null;
        };
        estado.metas.push({ ...g, atual: 0, archived: false });
        return semCorpo(201);
      }
      if (req.method() === "PATCH" && idDoFiltro) {
        const campos = corpo as { archived_at?: string | null };
        estado.metas = estado.metas.map((m) =>
          m.id === idDoFiltro ? { ...m, archived: campos.archived_at != null } : m,
        );
        return semCorpo();
      }
    }

    if (tabela === "focus_sessions" && req.method() === "POST") {
      const s = corpo as { started_at: string; ended_at: string };
      const minutos = Math.round((Date.parse(s.ended_at) - Date.parse(s.started_at)) / 60_000);
      const dia = hoje;
      const existente = estado.diasDeFoco.find((d) => d.dia === dia);
      if (existente) {
        existente.minutos += minutos;
        existente.sessoes += 1;
      } else {
        estado.diasDeFoco.push({ dia, minutos, sessoes: 1 });
      }
      return semCorpo(201);
    }

    if (tabela === "profiles" && req.method() === "PATCH") {
      // O banco aplica qualquer coluna enviada (o falso só espelha no perfil em memória).
      Object.assign(estado.perfil, corpo as Record<string, unknown>);
      return semCorpo();
    }

    return json({ message: `Rota falsa não implementada: ${req.method()} ${tabela}` }, 501);
  });
}

/** Fixa o relógio do navegador (o "hoje" da tela) e instala o falso. */
export async function prepararTela(page: Page, estado: EstadoFalso) {
  // 2026-10-07 15:00 em São Paulo (UTC-3) = quarta-feira.
  await page.clock.setFixedTime(new Date("2026-10-07T18:00:00Z"));
  await instalarSupabaseFalso(page, estado, "2026-10-07");
}

/** Cenário padrão: 3 trilhas e tarefas em todos os grupos. */
export function cenarioPadrao(): EstadoFalso {
  const sql = trilha("SQL", "S");
  const python = trilha("Python", "Py");
  const pbi = trilha("Power BI", "P");
  return criarEstado({
    trilhas: [sql, python, pbi],
    tarefas: [
      tarefa({
        title: "Modelagem estrela",
        track_id: pbi.id,
        due_on: "2026-10-05",
        priority: 3,
        estimate_min: 60,
      }),
      tarefa({
        title: "Window functions",
        track_id: sql.id,
        due_on: "2026-10-07",
        due_time: "19:00:00",
        priority: 3,
      }),
      tarefa({ title: "Pandas merge", track_id: python.id, due_on: "2026-10-07", priority: 2 }),
      tarefa({ title: "dbt jaffle shop", due_on: "2026-10-09", priority: 1 }),
      tarefa({ title: "Podcast em inglês" }),
      tarefa({ title: "Feita ontem", status: "done", due_on: "2026-10-06" }),
    ],
  });
}

/**
 * Intercepta as rotas do servidor /api/google/* (que no teste não têm Google de verdade).
 * Guarda as chamadas e responde como o servidor responderia.
 */
export async function instalarApiGoogleFalsa(
  page: Page,
  estado: EstadoFalso,
  respostaDoSync: { status: string } = { status: "ok" },
) {
  const chamadas: string[] = [];
  await page.route("**/api/google/sincronizar", (rota) => {
    chamadas.push("sincronizar");
    if (estado.google.conexao && respostaDoSync.status === "ok") {
      estado.google.conexao.last_synced_at = new Date().toISOString();
    }
    return rota.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(respostaDoSync),
    });
  });
  await page.route("**/api/google/desconectar", (rota) => {
    chamadas.push("desconectar");
    estado.google = { conexao: null, agendas: [], eventos: [] };
    return rota.fulfill({ status: 200, contentType: "application/json", body: '{"status":"ok"}' });
  });
  return chamadas;
}
