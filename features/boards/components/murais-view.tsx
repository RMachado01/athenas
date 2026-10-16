"use client";

import { Archive, Plus, Trash2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { ConfirmarExclusao } from "@/components/ui/confirmar-exclusao";
import { Esqueleto } from "@/components/ui/esqueleto";
import { FolhaDeArquivados } from "@/components/ui/folha-de-arquivados";
import { FolhaInferior } from "@/components/ui/folha-inferior";
import { MenuDeOpcoes } from "@/components/ui/menu-de-opcoes";
import { useTrilhas } from "@/features/tracks/queries";
import { varDaCor } from "../cores";
import {
  useArquivarMural,
  useExcluirMural,
  useMurais,
  useMuraisArquivados,
  useRestaurarMural,
  type ResumoDeMural,
} from "../queries";
import { IconeDoMural } from "./icone-do-mural";
import { NovoMural } from "./novo-mural";

/**
 * Lista de murais (MOBILE PRIMEIRO, estilo Notion: cards limpos com ícone e uma faixa de cor).
 * O mais recente primeiro. Tocar abre o quadro; o "+" cria um mural novo.
 */
export function MuraisView({ caminhoBase = "/murais" }: { caminhoBase?: string }) {
  const { data: murais, isPending, isError, refetch } = useMurais();
  const { data: trilhas = [] } = useTrilhas();
  const arquivar = useArquivarMural();
  const excluir = useExcluirMural();
  const restaurar = useRestaurarMural();
  const { data: arquivados = [] } = useMuraisArquivados();
  const [arquivadosAbertos, setArquivadosAbertos] = useState(false);
  const [paraExcluir, setParaExcluir] = useState<ResumoDeMural | null>(null);
  const router = useRouter();
  const [novoAberto, setNovoAberto] = useState(false);
  const nomeDaTrilha = useMemo(() => new Map(trilhas.map((t) => [t.id, t.name])), [trilhas]);

  return (
    <main className="flex flex-col gap-6 px-5 pt-[calc(1.5rem+env(safe-area-inset-top))]">
      <header className="flex items-end justify-between gap-3">
        <div className="flex flex-col gap-1">
          <span className="text-ink-muted text-body-sm font-medium">
            Post-its, tarefas e ideias no espaço
          </span>
          <h1 className="font-display text-display-lg">Murais</h1>
        </div>
        <button
          type="button"
          onClick={() => setNovoAberto(true)}
          aria-label="Novo mural"
          className="botao-primario grid size-12 shrink-0 cursor-pointer place-items-center"
        >
          <Plus className="size-6" strokeWidth={2.5} aria-hidden />
        </button>
      </header>

      {isError ? (
        <p role="alert" className="border-danger text-danger rounded-lg border p-4">
          Não deu pra carregar os murais.{" "}
          <button type="button" onClick={() => refetch()} className="underline">
            Tentar de novo
          </button>
        </p>
      ) : isPending ? (
        <div aria-busy="true" className="grid grid-cols-2 gap-3">
          <span className="sr-only">Carregando murais</span>
          <Esqueleto className="h-36" />
          <Esqueleto className="h-36" />
        </div>
      ) : (murais ?? []).length === 0 ? (
        <div className="cartao flex flex-col items-start gap-3 rounded-xl p-5">
          <p className="font-semibold">Nenhum mural ainda</p>
          <p className="text-ink-muted text-body-sm">
            Crie um mural para colar post-its, trazer tarefas, agrupar por semana e ligar ideias com
            setas.
          </p>
          <button
            type="button"
            onClick={() => setNovoAberto(true)}
            className="botao-primario min-h-11 cursor-pointer px-5 font-semibold"
          >
            Criar meu primeiro mural
          </button>
        </div>
      ) : (
        <ul role="list" className="grid grid-cols-2 gap-3">
          {(murais ?? []).map((m) => (
            <li key={m.id} className="relative">
              <Link
                href={`${caminhoBase}/${m.id}`}
                className="cartao tocavel flex h-36 flex-col justify-between overflow-hidden rounded-xl p-4"
              >
                <span
                  aria-hidden="true"
                  className="absolute inset-x-0 top-0 h-1.5"
                  style={{ background: varDaCor(m.cor) }}
                />
                <span
                  className="grid size-10 place-items-center rounded-md"
                  style={{
                    background: `color-mix(in srgb, ${varDaCor(m.cor)} 30%, var(--surface))`,
                  }}
                >
                  <IconeDoMural icone={m.icone} className="size-5" />
                </span>
                <span className="flex min-w-0 flex-col">
                  <span className="truncate font-semibold">{m.titulo}</span>
                  <span className="text-ink-muted text-body-sm truncate">
                    {m.itens} {m.itens === 1 ? "item" : "itens"}
                    {m.trilhaId && nomeDaTrilha.get(m.trilhaId)
                      ? ` · ${nomeDaTrilha.get(m.trilhaId)}`
                      : ""}
                  </span>
                </span>
              </Link>
              <MenuDeOpcoes
                rotulo={`Opções do mural ${m.titulo}`}
                className="absolute top-2 right-2"
                itens={[
                  { rotulo: "Arquivar", Icone: Archive, aoEscolher: () => arquivar(m) },
                  {
                    rotulo: "Excluir…",
                    Icone: Trash2,
                    perigo: true,
                    aoEscolher: () => setParaExcluir(m),
                  },
                ]}
              />
            </li>
          ))}
        </ul>
      )}

      <ConfirmarExclusao
        aberto={paraExcluir !== null}
        aoMudar={(aberto) => !aberto && setParaExcluir(null)}
        titulo="Excluir este mural?"
        descricao={
          paraExcluir
            ? `“${paraExcluir.titulo}” e ${
                paraExcluir.itens === 0
                  ? "tudo o que estiver nele"
                  : paraExcluir.itens === 1
                    ? "o item e as setas dele"
                    : `os ${paraExcluir.itens} itens e as setas dele`
              } serão apagados. As tarefas continuam existindo.`
            : ""
        }
        aoConfirmar={() => {
          if (paraExcluir) excluir.mutate({ id: paraExcluir.id });
          setParaExcluir(null);
        }}
      />

      {arquivados.length > 0 && (
        <button
          type="button"
          onClick={() => setArquivadosAbertos(true)}
          className="text-ink-muted hover:text-ink flex min-h-11 cursor-pointer items-center gap-2 self-start rounded-pill px-3 font-semibold"
        >
          <Archive className="size-4" aria-hidden />
          Arquivados · {arquivados.length}
        </button>
      )}

      <FolhaDeArquivados
        aberta={arquivadosAbertos}
        aoMudar={setArquivadosAbertos}
        titulo="Murais arquivados"
        tipo="mural"
        itens={arquivados.map((m) => ({ id: m.id, titulo: m.titulo }))}
        aoRestaurar={(m) => restaurar.mutate({ id: m.id })}
        aoExcluir={(m) => excluir.mutate({ id: m.id })}
      />

      <FolhaInferior aberta={novoAberto} aoMudar={setNovoAberto} titulo="Novo mural">
        <NovoMural
          aoCriar={(id) => {
            setNovoAberto(false);
            router.push(`${caminhoBase}/${id}`);
          }}
        />
      </FolhaInferior>
    </main>
  );
}
