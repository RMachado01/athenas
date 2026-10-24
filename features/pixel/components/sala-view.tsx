"use client";

import { useReducedMotionConfig } from "motion/react";
import { CircleDot, Cookie, PawPrint, Pencil } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { Esqueleto } from "@/components/ui/esqueleto";
import { FolhaInferior } from "@/components/ui/folha-inferior";
import { acharVariacao, CATALOGO } from "../pets/catalogo";
import { usePerfilPixel, useSalvarPet } from "../queries";
import { reacoesDoPet } from "../reacoes";
import { useSinaisDoPet } from "../sinais";
import type { ControleDoPet } from "./pet-na-sala";
import { AdotarPet } from "./adotar-pet";
import { PalcoDaSala } from "./palco-da-sala";

/** Guarda o dia (AAAA-MM-DD) da última comemoração de meta: o pet comemora uma vez por dia. */
const CHAVE_DA_COMEMORACAO = "athenas-sala-comemorou";
/** De quanto em quanto tempo o balão sobre o pet troca de recado. */
const TROCA_DE_BALAO_MS = 6_000;

/** Comemorar a meta só na 1ª vez do dia que a Sala abre com ela batida. */
function primeiraComemoracaoDoDia(): boolean {
  const hoje = new Date().toLocaleDateString("en-CA"); // AAAA-MM-DD no horário do aparelho
  try {
    if (window.localStorage.getItem(CHAVE_DA_COMEMORACAO) === hoje) return false;
    window.localStorage.setItem(CHAVE_DA_COMEMORACAO, hoje);
  } catch {
    /* sem armazenamento: comemora toda vez, sem problema */
  }
  return true;
}

/**
 * A Sala (MOBILE PRIMEIRO): uma biblioteca em pixel art, vista de lado, com o pet da pessoa
 * andando, dormindo, pedindo carinho e reagindo aos seus estudos (recados). Dá para brincar
 * com ele (petisco, bolinha). Sem pet, convida a adotar um. Por enquanto é só dela.
 */
export function SalaView() {
  const { data: perfil, isPending, isError, refetch } = usePerfilPixel();
  const salvar = useSalvarPet();
  const [folhaAberta, setFolhaAberta] = useState(false);
  const pet = perfil?.pet ?? null;
  const reduzido = useReducedMotionConfig();
  const { sinais, pronto } = useSinaisDoPet();
  const reacoes = useMemo(() => reacoesDoPet(sinais), [sinais]);
  const controle = useRef<ControleDoPet>(null);

  // O balão mostra um recado por vez e troca a cada 6 s (parado com "reduzir movimento").
  const [vez, setVez] = useState(0);
  useEffect(() => {
    if (reduzido || reacoes.length < 2) return;
    const id = window.setInterval(() => setVez((v) => v + 1), TROCA_DE_BALAO_MS);
    return () => window.clearInterval(id);
  }, [reduzido, reacoes.length]);
  const reacaoAtual = reacoes.length > 0 ? reacoes[vez % reacoes.length]!.emote : null;

  // Decidido uma vez, quando os sinais chegam: comemorar a meta e começar dormindo.
  const [inicio, setInicio] = useState<{ comemorar: boolean; sonolento: boolean } | null>(null);
  // Trava contra o efeito rodar 2 vezes (desenvolvimento): a 2ª leria "já comemorou hoje".
  const decidido = useRef(false);
  useEffect(() => {
    if (!pronto || decidido.current) return;
    decidido.current = true;
    const metaBatida = sinais.metaMin > 0 && sinais.minutosHoje >= sinais.metaMin;

    setInicio({
      comemorar: metaBatida && !sinais.focoRodando && primeiraComemoracaoDoDia(),
      sonolento: sinais.noite || (sinais.diasSemEstudar !== null && sinais.diasSemEstudar >= 2),
    });
  }, [pronto, sinais]);

  return (
    <main className="flex flex-col gap-5 px-5 pt-[calc(1.5rem+env(safe-area-inset-top))]">
      <header className="flex flex-col gap-1">
        <span className="text-ink-muted text-body-sm font-medium">Seu cantinho de estudo</span>
        <h1 className="font-display text-display-lg">Sala</h1>
      </header>

      {isError ? (
        <p role="alert" className="border-danger text-danger rounded-lg border p-4">
          Não deu pra carregar a sala.{" "}
          <button type="button" onClick={() => refetch()} className="underline">
            Tentar de novo
          </button>
        </p>
      ) : isPending || (pet && !inicio) ? (
        <div aria-busy="true">
          <span className="sr-only">Carregando a sala</span>
          <Esqueleto className="aspect-[8/5] w-full rounded-xl" />
        </div>
      ) : (
        <>
          <PalcoDaSala
            pet={pet}
            ref={controle}
            estudando={sinais.focoRodando}
            sonolento={inicio?.sonolento ?? false}
            comemorarAoAbrir={inicio?.comemorar ?? false}
            reacao={reacaoAtual}
          />

          {pet && (
            <div
              className="flex flex-wrap gap-2"
              role="group"
              aria-label={`Brincar com ${pet.nome}`}
            >
              <button
                type="button"
                onClick={() => controle.current?.petisco()}
                className="botao-vidro text-body-sm flex min-h-11 cursor-pointer items-center gap-2 px-4 font-semibold"
              >
                <Cookie className="size-4" aria-hidden />
                Dar petisco
              </button>
              <button
                type="button"
                onClick={() => controle.current?.bolinha()}
                className="botao-vidro text-body-sm flex min-h-11 cursor-pointer items-center gap-2 px-4 font-semibold"
              >
                <CircleDot className="size-4" aria-hidden />
                Jogar bolinha
              </button>
            </div>
          )}

          {pet && reacoes.length > 0 && (
            <section
              aria-labelledby="titulo-recados"
              className="cartao flex flex-col gap-2 rounded-xl p-4"
            >
              <h2 id="titulo-recados" className="text-ink-muted text-body-sm font-medium">
                Recados do {pet.nome}
              </h2>
              <ul className="flex flex-col gap-2">
                {reacoes.map((r) => (
                  <li key={r.emote} className="flex flex-wrap items-center justify-between gap-2">
                    <span>{r.texto.charAt(0).toLocaleUpperCase("pt-BR") + r.texto.slice(1)}</span>
                    {r.link && (
                      <Link
                        href={r.link.href}
                        className="text-accent text-body-sm inline-flex min-h-11 items-center font-semibold underline-offset-4 hover:underline"
                      >
                        {r.link.rotulo}
                      </Link>
                    )}
                  </li>
                ))}
              </ul>
            </section>
          )}

          {pet ? (
            <section
              aria-labelledby="titulo-do-pet"
              className="cartao flex items-center gap-3 rounded-xl p-4"
            >
              <span className="bg-brand-soft/60 grid size-11 shrink-0 place-items-center rounded-md">
                <PawPrint className="text-accent size-5" aria-hidden />
              </span>
              <div className="flex min-w-0 flex-1 flex-col">
                <h2 id="titulo-do-pet" className="text-heading-2 truncate">
                  {pet.nome}
                </h2>
                <p className="text-ink-muted text-body-sm">
                  {CATALOGO[pet.especie].nome} · {acharVariacao(pet.especie, pet.variacao).nome}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setFolhaAberta(true)}
                className="botao-vidro text-body-sm flex min-h-11 shrink-0 cursor-pointer items-center gap-2 px-4 font-semibold"
              >
                <Pencil className="size-4" aria-hidden />
                Editar pet
              </button>
            </section>
          ) : (
            <section className="cartao flex flex-col items-start gap-3 rounded-xl p-5">
              <p className="font-semibold">Você ainda não tem um pet</p>
              <p className="text-ink-muted text-body-sm">
                Escolha um bichinho, dê um nome a ele e deixe-o fazer companhia enquanto você
                estuda.
              </p>
              <button
                type="button"
                onClick={() => setFolhaAberta(true)}
                className="botao-primario min-h-11 cursor-pointer px-5 font-semibold"
              >
                Adotar um pet
              </button>
            </section>
          )}

          {pet && (
            <p className="text-ink-muted text-body-sm">Toque no {pet.nome} para fazer carinho.</p>
          )}
        </>
      )}

      <FolhaInferior
        aberta={folhaAberta}
        aoMudar={setFolhaAberta}
        titulo={pet ? "Editar pet" : "Adotar um pet"}
      >
        {folhaAberta && (
          <AdotarPet
            inicial={pet}
            aoSalvar={(escolhido) => {
              salvar.mutate(escolhido);
              setFolhaAberta(false);
            }}
          />
        )}
      </FolhaInferior>
    </main>
  );
}
