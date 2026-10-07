"use server";

import { redirect } from "next/navigation";
import { criarClienteServidor } from "@/lib/supabase/servidor";

/** Encerra a sessão (apaga os cookies) e volta para o login. */
export async function sair() {
  const supabase = await criarClienteServidor();
  await supabase.auth.signOut();
  redirect("/login");
}
