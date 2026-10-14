"use client";

import { ArrowLeft, FileText, MoreHorizontal, Plus, Search } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { DropdownMenu } from "radix-ui";
import { useMemo, useState } from "react";
import { Esqueleto } from "@/components/ui/esqueleto";
import { FolhaInferior } from "@/components/ui/folha-inferior";
import { varDaCor } from "@/features/boards/cores";
import { buscarNotas } from "@/features/notes/documento";
import { useMontado } from "@/lib/usar-montado";
import { rotuloDoIntervalo } from "../agendador";
import {
  useArquivarBaralho,
  useArquivarCartao,
  useBaralhos,
  useCartoesDoBaralho,
  useSuspenderCartao,
  type Cartao,
} from "../queries";
import { FormularioDeBaralho } from "./formulario-de-baralho";
import { FormularioDeCartao } from "./formulario-de-cartao";

const ITEM_DO_MENU =
  "data-[highlighted]:bg-card flex min-h-11 w-full cursor-pointer items-center gap-3 rounded-md px-3 font-semibold outline-none";

/** Etiqueta do estado do cartão: Novo, Aprendendo, "em 3 d" (revisão) ou Suspenso. */
function etiqueta(c: Cartao, agora: Date | null): string {
  if (c.suspenso) return "Suspenso";
  if (c.estado.state === 0) return "Novo";
  if (c.estado.state !== 2) return "Aprendendo";
  if (!agora) return "Revisão";
  const due = new Date(c.estado.due);
  return due <= agora ? "Revisar hoje" : `Revisão · em ${rotuloDoIntervalo(agora, due)}`;
}

/** Tela de um baralho: revisar só ele, buscar, ver, criar e editar cartões. */
export function BaralhoView({
  id,
  caminhoBase = "/flashcards",
  caminhoDasNotas = "/notas",
}: {
  id: string;
  caminhoBase?: string;
  caminhoDasNotas?: string;
}) {
  const router = useRouter();
  const montado = useMontado(); // "em 3 d" depende do relógio: só depois de montar
  const { data: baralhos, isPending: carregandoBaralhos } = useBaralhos();
  const { data: cartoes, isPending, isError, refetch } = useCartoesDoBaralho(id);
  const arquivarBaralho = useArquivarBaralho();
  const [busca, setBusca] = useState("");
  const [novoAberto, setNovoAberto] = useState(false);
  const [editarAberto, setEditarAberto] = useState(false);
  const [aberto, setAberto] = useState<Cartao | null>(null);

  const baralho = baralhos?.find((b) => b.id === id);
  const lista = useMemo(
    () =>
      buscarNotas(
        (cartoes ?? []).map((c) => ({ ...c, titulo: c.frente, texto: c.verso })),
        busca,
      ),
    [cartoes, busca],
  );

  if (carregandoBaralhos) {
    return (
      <main aria-busy="true" className="flex flex-col gap-4 px-5 pt-6">
        <span className="sr-only">Carregando baralho</span>
        <Esqueleto className="h-11 w-11 rounded-full" />
        <Esqueleto className="h-10 w-2/3" />
        <Esqueleto className="h-20" />
      </main>
    );
  }
  if (!baralho) {
    return (
      <main className="flex flex-col gap-4 px-5 pt-8">
        <h1 className="text-heading-1">Baralho não encontrado</h1>
        <p className="text-ink-muted">Ele pode ter sido arquivado.</p>
        <Link href={caminhoBase} className="text-accent font-semibold">
          Voltar aos baralhos
        </Link>
      </main>
    );
  }

  const paraRevisar = baralho.paraHoje + baralho.novos;
  const agora = montado ? new Date() : null;

  return (
    <main className="flex flex-col gap-5 px-5 pt-[calc(1rem+env(safe-area-inset-top))]">
      <header className="flex items-center justify-between gap-2">
        <Link
          href={caminhoBase}
          aria-label="Voltar aos baralhos"
          className="botao-vidro grid size-11 shrink-0 place-items-center"
        >
          <ArrowLeft className="size-5" aria-hidden />
        </Link>
        <DropdownMenu.Root>
          <DropdownMenu.Trigger
            aria-label="Opções do baralho"
            className="botao-vidro grid size-11 shrink-0 cursor-pointer place-items-center"
          >
            <MoreHorizontal className="size-5" aria-hidden />
          </DropdownMenu.Trigger>
          <DropdownMenu.Portal>
            <DropdownMenu.Content
              align="end"
              sideOffset={8}
              className="menu-flutuante vidro-forte z-50 min-w-[200px] rounded-lg p-1.5"
            >
              <DropdownMenu.Item className={ITEM_DO_MENU} onSelect={() => setEditarAberto(true)}>
                Editar baralho
              </DropdownMenu.Item>
              {!baralho.padrao && (
                <DropdownMenu.Item
                  className={ITEM_DO_MENU}
                  onSelect={() =>
                    arquivarBaralho({ id: baralho.id, nome: baralho.nome }, () =>
                      router.push(caminhoBase),
                    )
                  }
                >
                  Arquivar baralho
                </DropdownMenu.Item>
              )}
            </DropdownMenu.Content>
          </DropdownMenu.Portal>
        </DropdownMenu.Root>
      </header>

      <div className="flex items-end justify-between gap-3">
        <div className="flex min-w-0 flex-col gap-1">
          <span className="text-ink-muted text-body-sm flex items-center gap-2 font-medium">
            <span
              aria-hidden
              className="size-3 rounded-full"
              style={{ background: varDaCor(baralho.cor) }}
            />
            {baralho.total} {baralho.total === 1 ? "cartão" : "cartões"}
          </span>
          <h1 className="font-display text-display-lg truncate">{baralho.nome}</h1>
        </div>
        <button
          type="button"
          onClick={() => setNovoAberto(true)}
          aria-label="Novo cartão"
          className="botao-primario grid size-12 shrink-0 cursor-pointer place-items-center"
        >
          <Plus className="size-6" strokeWidth={2.5} aria-hidden />
        </button>
      </div>

      {paraRevisar > 0 && (
        <Link
          href={`${caminhoBase}/revisar?baralho=${baralho.id}`}
          className="botao-primario flex min-h-14 items-center justify-center font-semibold"
        >
          Revisar este baralho ({paraRevisar})
        </Link>
      )}

      {(cartoes?.length ?? 0) > 0 && (
        <div className="campo rounded-pill flex min-h-12 items-center gap-2 px-4">
          <Search className="text-ink-muted size-[18px] shrink-0" aria-hidden />
          <label htmlFor="buscar-cartoes" className="sr-only">
            Buscar cartões
          </label>
          <input
            id="buscar-cartoes"
            type="search"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar na frente ou no verso"
            autoComplete="off"
            className="min-w-0 flex-1 bg-transparent text-[16px] outline-none"
          />
        </div>
      )}

      {isError ? (
        <p role="alert" className="border-danger text-danger rounded-lg border p-4">
          Não deu pra carregar os cartões.{" "}
          <button type="button" onClick={() => refetch()} className="underline">
            Tentar de novo
          </button>
        </p>
      ) : isPending ? (
        <div aria-busy="true" className="flex flex-col gap-2">
          <span className="sr-only">Carregando cartões</span>
          <Esqueleto className="h-16" />
          <Esqueleto className="h-16" />
        </div>
      ) : cartoes.length === 0 ? (
        <div className="cartao flex flex-col items-start gap-3 rounded-xl p-5">
          <p className="font-semibold">Baralho vazio</p>
          <p className="text-ink-muted text-body-sm">
            Toque em + para criar um cartão. Uma pergunta por cartão, com resposta curta.
          </p>
        </div>
      ) : lista.length === 0 ? (
        <p className="text-ink-muted p-2">Nenhum cartão encontrado para “{busca}”.</p>
      ) : (
        <ul role="list" className="flex flex-col gap-2">
          {lista.map((c) => (
            <li key={c.id}>
              <button
                type="button"
                onClick={() => setAberto(c)}
                className="cartao tocavel flex w-full cursor-pointer gap-3 rounded-lg p-4 text-left"
              >
                <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                  <span className="truncate font-semibold">{c.frente}</span>
                  <span className="text-ink-muted text-body-sm truncate">{c.verso}</span>
                </span>
                <span className="flex shrink-0 flex-col items-end gap-1">
                  <span className="text-ink-muted text-body-sm">{etiqueta(c, agora)}</span>
                  {c.notaId && (
                    <FileText className="text-ink-muted size-4" aria-label="Vem de uma nota" />
                  )}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}

      <FolhaInferior aberta={novoAberto} aoMudar={setNovoAberto} titulo="Novo cartão">
        <FormularioDeCartao baralhoInicial={baralho.id} aoTerminar={() => setNovoAberto(false)} />
      </FolhaInferior>

      <FolhaInferior aberta={editarAberto} aoMudar={setEditarAberto} titulo="Editar baralho">
        <FormularioDeBaralho baralho={baralho} aoTerminar={() => setEditarAberto(false)} />
      </FolhaInferior>

      <FolhaInferior
        aberta={aberto !== null}
        aoMudar={(v) => !v && setAberto(null)}
        titulo="Cartão"
      >
        {aberto && (
          <DetalheDoCartao
            cartao={aberto}
            caminhoDasNotas={caminhoDasNotas}
            aoTerminar={() => setAberto(null)}
          />
        )}
      </FolhaInferior>
    </main>
  );
}

function DetalheDoCartao({
  cartao,
  caminhoDasNotas,
  aoTerminar,
}: {
  cartao: Cartao;
  caminhoDasNotas: string;
  aoTerminar: () => void;
}) {
  const suspender = useSuspenderCartao();
  const arquivar = useArquivarCartao();

  const acoes = (
    <div className="flex flex-col gap-2">
      <button
        type="button"
        onClick={() => {
          suspender.mutate({ id: cartao.id, suspenso: !cartao.suspenso });
          aoTerminar();
        }}
        className="botao-vidro min-h-12 cursor-pointer font-semibold"
      >
        {cartao.suspenso ? "Reativar na revisão" : "Suspender (tirar da revisão)"}
      </button>
      {!cartao.notaId && (
        <button
          type="button"
          onClick={() => {
            arquivar(cartao.id);
            aoTerminar();
          }}
          className="botao-vidro text-danger min-h-12 cursor-pointer font-semibold"
        >
          Arquivar cartão
        </button>
      )}
    </div>
  );

  if (cartao.notaId) {
    return (
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-1">
          <span className="text-ink-muted text-body-sm font-medium">Frente</span>
          <p className="whitespace-pre-wrap">{cartao.frente}</p>
        </div>
        <div className="flex flex-col gap-1">
          <span className="text-ink-muted text-body-sm font-medium">Verso</span>
          <p className="whitespace-pre-wrap">{cartao.verso}</p>
        </div>
        <p className="text-ink-muted text-body-sm">
          Este cartão nasceu de uma linha “pergunta :: resposta” de uma nota. Para mudar o texto,
          edite a nota.
        </p>
        <Link
          href={`${caminhoDasNotas}/${cartao.notaId}`}
          className="botao-primario flex min-h-12 items-center justify-center font-semibold"
        >
          Editar na nota
        </Link>
        {acoes}
      </div>
    );
  }
  return (
    <div className="flex flex-col gap-4">
      <FormularioDeCartao
        cartao={cartao}
        baralhoInicial={cartao.baralhoId}
        aoTerminar={aoTerminar}
      />
      {acoes}
    </div>
  );
}
