"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { comemorar, type Decisao } from "../estados";
import { BALOES, OBJETOS_DA_SALA } from "../extras";
import { animacaoDoEstado, quadrosDoPet, type EstadoDoPet } from "../pets/animacoes";
import { acharVariacao, paletaDoPet } from "../pets/catalogo";
import { PALETA_EXTRA } from "../pets/pecas-extras";
import { usePerfilPixel } from "../queries";
import { Sprite } from "./sprite";

type Fase = "foco" | "pausa" | "pausa-longa";

/**
 * O pet na tela de Foco (S4 "estudar junto" e S5 "comemorar"): pequeno, ao lado do cronômetro.
 * - foco rodando: deitadinho ao lado de um livro, com o balão de música;
 * - um foco terminou (a fase virou pausa): dois pulinhos com o balão de estrelas;
 * - no resto do tempo: parado, olhando.
 * Sem pet adotado, não aparece nada. É um enfeite: o que importa é anunciado em texto.
 */
export function PetCompanheiro({ fase, rodando }: { fase: Fase; rodando: boolean }) {
  const { data } = usePerfilPixel();
  const pet = data?.pet ?? null;
  const [festa, setFesta] = useState<Decisao | null>(null);
  const faseAnterior = useRef(fase);

  // Foco → pausa = um foco foi concluído: comemora (a fila de passos roda com timeouts).
  useEffect(() => {
    const antes = faseAnterior.current;
    faseAnterior.current = fase;
    if (antes !== "foco" || fase === "foco") return;
    const passos = comemorar();
    const timeouts: number[] = [];
    let espera = 0;
    for (const p of passos) {
      timeouts.push(window.setTimeout(() => setFesta(p), espera));
      espera += p.duracaoMs;
    }
    timeouts.push(window.setTimeout(() => setFesta(null), espera));
    return () => timeouts.forEach((t) => window.clearTimeout(t));
  }, [fase]);

  if (!pet) return null;

  const estudando = fase === "foco" && rodando;
  const estado: EstadoDoPet = festa?.estado ?? (estudando ? "descansando" : "parado");
  const balao = festa ? BALOES.estrela : estudando ? BALOES.musica : null;
  const variacao = acharVariacao(pet.especie, pet.variacao);

  return (
    <Link
      href="/sala"
      data-testid="pet-companheiro"
      data-estado={estado}
      aria-label={
        festa
          ? `${pet.nome} está comemorando o foco concluído. Abrir a Sala`
          : estudando
            ? `${pet.nome} está estudando junto com você. Abrir a Sala`
            : `${pet.nome}. Abrir a Sala`
      }
      className="relative flex min-h-11 items-end gap-1 self-center rounded-xl px-2 pt-8"
    >
      {balao && (
        <span className="pointer-events-none absolute top-0 right-0">
          <Sprite quadros={[balao]} paleta={PALETA_EXTRA} escala={2} parado />
        </span>
      )}
      <Sprite
        key={estado}
        quadros={quadrosDoPet(pet.especie, estado, {
          acessorio: pet.acessorio,
          variacao: pet.variacao,
        })}
        paleta={paletaDoPet(variacao)}
        escala={3}
        duracaoMs={animacaoDoEstado(estado).cicloMs}
      />
      {estudando && (
        <Sprite quadros={[OBJETOS_DA_SALA.livro]} paleta={PALETA_EXTRA} escala={2} parado />
      )}
    </Link>
  );
}
