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
  };
  trilhas: LinhaDeTrilha[];
  tarefas: LinhaDeTarefa[];
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
    },
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
      if (tabela === "profiles") {
        const quer = req.headers()["accept"]?.includes("pgrst.object");
        return json(quer ? estado.perfil : [estado.perfil]);
      }
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

    if (tabela === "profiles" && req.method() === "PATCH") {
      const campos = corpo as { appearance?: Record<string, unknown> };
      if (campos.appearance) estado.perfil.appearance = campos.appearance;
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
