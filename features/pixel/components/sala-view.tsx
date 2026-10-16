"use client";

import { PawPrint, Pencil } from "lucide-react";
import { useState } from "react";
import { Esqueleto } from "@/components/ui/esqueleto";
import { FolhaInferior } from "@/components/ui/folha-inferior";
import { acharVariacao, CATALOGO } from "../pets/catalogo";
import { usePerfilPixel, useSalvarPet } from "../queries";
import { AdotarPet } from "./adotar-pet";
import { PalcoDaSala } from "./palco-da-sala";

/**
 * A Sala (MOBILE PRIMEIRO): uma biblioteca em pixel art, vista de lado, com o pet da pessoa
 * andando, dormindo e pedindo carinho. Sem pet, convida a adotar um (escolher espécie, cor e
 * nome). Por enquanto é só dela: ninguém mais vê a sala.
 */
export function SalaView() {
  const { data: perfil, isPending, isError, refetch } = usePerfilPixel();
  const salvar = useSalvarPet();
  const [folhaAberta, setFolhaAberta] = useState(false);
  const pet = perfil?.pet ?? null;

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
      ) : isPending ? (
        <div aria-busy="true">
          <span className="sr-only">Carregando a sala</span>
          <Esqueleto className="aspect-[8/5] w-full rounded-xl" />
        </div>
      ) : (
        <>
          <PalcoDaSala pet={pet} />

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
