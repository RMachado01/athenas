"use client";

import { useReducedMotionConfig } from "motion/react";
import * as m from "motion/react-m";
import { useEffect, useState, type ReactNode } from "react";
import { DURACAO, EASE_OUT } from "@/lib/movimento";

// Só na PRIMEIRA tela o foco fica onde o navegador colocou (topo da página). Nas trocas
// seguintes, levamos o foco ao título, como um app nativo anuncia a tela nova.
let primeiraTela = true;

/**
 * Envolve cada tela do app (usado no template.tsx, que o Next remonta a cada navegação):
 *  1) entrada curta (fade de 160 ms) para a troca não ser um "corte seco". Só opacidade, de
 *     propósito: um transform aqui viraria a "caixa" dos elementos position:fixed da tela
 *     (barra do mural, botões da revisão) e eles pulariam durante a animação;
 *  2) acessibilidade: depois de navegar, o foco vai para o <h1> da tela nova. Sem isso, quem usa
 *     leitor de tela continua "parado" no link que tocou e não sabe que a tela mudou.
 *     Se a tela nova já pôs o foco num campo (ex.: editor de nota nova), não mexemos.
 * O <h1> pode chegar depois (dados carregando), então procuramos por até ~1,5 s.
 */
export function TrocaDeTela({
  children,
  animar = true,
}: {
  children: ReactNode;
  /** false nas páginas de laboratório: lá o template fica FORA do provedor de animação (o
   *  LazyMotion vem dentro da página) e a tela ficaria presa na opacidade 0. */
  animar?: boolean;
}) {
  const reduzido = useReducedMotionConfig();
  // A primeira tela chega pronta do servidor: animar a entrada dela só atrasaria o que a pessoa
  // vê (o HTML viria com opacidade 0). No servidor a variável nunca muda, então é sempre "sim".
  const [ehAPrimeira] = useState(() => primeiraTela);

  useEffect(() => {
    // Lê o estado (não a variável): em desenvolvimento o React roda o efeito DUAS vezes, e na
    // segunda a variável já diria "não é a primeira", mexendo no <h1> antes da hidratação.
    primeiraTela = false;
    if (ehAPrimeira) return;
    let tentativas = 0;
    let relogio: ReturnType<typeof setTimeout> | undefined;
    const focar = () => {
      const atual = document.activeElement;
      const emCampo =
        atual instanceof HTMLElement &&
        (atual.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(atual.tagName));
      if (emCampo) return;
      const titulo = document.querySelector<HTMLElement>("main h1");
      if (titulo) {
        if (!titulo.hasAttribute("tabindex")) titulo.setAttribute("tabindex", "-1");
        titulo.focus({ preventScroll: true });
        return;
      }
      if (++tentativas < 15) relogio = setTimeout(focar, 100);
    };
    focar();
    return () => clearTimeout(relogio);
  }, [ehAPrimeira]);

  if (reduzido || !animar || ehAPrimeira) return <>{children}</>;
  return (
    <m.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: DURACAO.rapida, ease: EASE_OUT }}
    >
      {children}
    </m.div>
  );
}
