"use client";

import { useState } from "react";
import { destinoSeguro } from "@/lib/rotas";
import { criarClienteNavegador } from "@/lib/supabase/cliente";

/**
 * Botão "Entrar com Google". Pede só identidade (nome, e-mail, foto): o acesso à Agenda do Google
 * é um passo separado, depois, em Ajustes (ADR-005) — assim ninguém dá permissão além do necessário.
 */
export function BotaoGoogle({ destino }: { destino?: string | null }) {
  const [abrindo, setAbrindo] = useState(false);
  const [falhou, setFalhou] = useState(false);

  async function entrar() {
    setAbrindo(true);
    setFalhou(false);
    try {
      const supabase = criarClienteNavegador();
      const proximo = destinoSeguro(destino);
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(proximo)}`,
        },
      });
      if (error) throw error;
      // Sucesso: o navegador já está indo para o Google; mantemos o botão desabilitado.
    } catch {
      setAbrindo(false);
      setFalhou(true);
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <button
        type="button"
        onClick={entrar}
        disabled={abrindo}
        className="botao-primario min-h-12 w-full cursor-pointer px-4 font-semibold"
      >
        {abrindo ? "Abrindo o Google…" : "Entrar com Google"}
      </button>
      {falhou && (
        <p role="alert" className="text-danger text-[13px] leading-[18px]">
          Não deu pra abrir o Google. Tentar de novo?
        </p>
      )}
    </div>
  );
}
