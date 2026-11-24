"use client";

import { useEffect, useRef, useState, type ComponentProps } from "react";
import type { AvatarSalvo } from "../avatar/modelo";
import type { PetEscolhido } from "../queries";
import { AvatarNaSala } from "./avatar-na-sala";
import { CenaDaSala } from "./cena-da-sala";
import { PetNaSala } from "./pet-na-sala";

/** O que a Sala repassa ao pet (estudando junto, reação, botões de brincar…). */
type ComportamentoDoPet = Omit<
  ComponentProps<typeof PetNaSala>,
  "pet" | "escala" | "larguraDaCena"
>;

/** Escala dos pets: 3x no celular e cresce de 1 em 1 em telas largas (sempre inteira: pixel nítido). */
export function escalaDoPet(larguraDaCena: number): number {
  return Math.max(3, Math.round(larguraDaCena / 160));
}

/**
 * O palco: a sala (fundo) com o pet por cima, numa caixa de proporção fixa (16:10). Mede a
 * própria largura para saber o tamanho do pet e até onde ele pode andar.
 */
export function PalcoDaSala({
  pet,
  avatar,
  aoTocarNoAvatar,
  ...comportamento
}: {
  pet: PetEscolhido | null;
  /** O avatar sentado na mesa (sem ele, a sala fica só com o pet). */
  avatar?: AvatarSalvo;
  aoTocarNoAvatar?: () => void;
} & ComportamentoDoPet) {
  const caixa = useRef<HTMLDivElement>(null);
  const [largura, setLargura] = useState(0);

  useEffect(() => {
    const el = caixa.current;
    if (!el) return;
    const medir = () => setLargura(el.clientWidth);
    medir();
    const observador = new ResizeObserver(medir);
    observador.observe(el);
    return () => observador.disconnect();
  }, []);

  return (
    <div
      ref={caixa}
      data-testid="palco-da-sala"
      className="border-hairline relative aspect-[8/5] w-full overflow-hidden rounded-xl border"
    >
      <CenaDaSala />
      {/* O avatar vem antes do pet: o pet passeia pelo chão NA FRENTE da mesa. */}
      {avatar && largura > 0 && (
        <AvatarNaSala
          avatar={avatar}
          larguraDaCena={largura}
          estudando={comportamento.estudando ?? false}
          aoTocar={() => aoTocarNoAvatar?.()}
        />
      )}
      {pet && largura > 0 && (
        <PetNaSala
          key={pet.especie}
          pet={pet}
          escala={escalaDoPet(largura)}
          larguraDaCena={largura}
          {...comportamento}
        />
      )}
    </div>
  );
}
