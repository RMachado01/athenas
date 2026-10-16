"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { chaves } from "@/lib/chaves-de-consulta";
import { usePerfil } from "@/lib/perfil";
import { criarClienteNavegador } from "@/lib/supabase/cliente";
import { ehEspecie } from "./pets/catalogo";
import type { Especie } from "./pets/especies";

/** O pet da pessoa: espécie, cor e o NOME que ela escolheu. */
export interface PetEscolhido {
  especie: Especie;
  variacao: string;
  nome: string;
}

export interface PerfilPixel {
  pet: PetEscolhido | null;
}

/** Limite do nome (o banco confere de novo: pixel_pet_name_check). */
export const MAX_NOME_DO_PET = 24;

/** Valida o nome na tela, antes de mandar para o banco. Devolve a mensagem de erro, ou null. */
export function erroDoNomeDoPet(nome: string): string | null {
  const limpo = nome.trim();
  if (!limpo) return "Dê um nome para o seu pet.";
  if (limpo.length > MAX_NOME_DO_PET) return `O nome pode ter até ${MAX_NOME_DO_PET} letras.`;
  if (/[\r\n]/.test(limpo)) return "O nome não pode ter quebra de linha.";
  return null;
}

/** Lê o perfil pixel da própria pessoa (RLS: só a linha dela). Sem linha = ainda não adotou. */
export function usePerfilPixel() {
  return useQuery({
    queryKey: chaves.perfilPixel,
    queryFn: async (): Promise<PerfilPixel> => {
      const { data, error } = await criarClienteNavegador()
        .from("pixel_profiles")
        .select("pet_species, pet_variant, pet_name")
        .limit(1);
      if (error) throw error;
      const linha = data[0];
      if (!linha || !ehEspecie(linha.pet_species) || !linha.pet_variant || !linha.pet_name) {
        return { pet: null };
      }
      return {
        pet: { especie: linha.pet_species, variacao: linha.pet_variant, nome: linha.pet_name },
      };
    },
  });
}

/** Adota ou troca o pet (cria ou atualiza a linha: upsert). Otimista: a sala já mostra o novo. */
export function useSalvarPet() {
  const queryClient = useQueryClient();
  const { data: perfil } = usePerfil();

  return useMutation<void, Error, PetEscolhido, { anterior: PerfilPixel | undefined }>({
    mutationFn: async (pet) => {
      if (!perfil) throw new Error("Perfil ainda não carregou");
      const { error } = await criarClienteNavegador().from("pixel_profiles").upsert(
        {
          user_id: perfil.id,
          pet_species: pet.especie,
          pet_variant: pet.variacao,
          pet_name: pet.nome.trim(),
        },
        { onConflict: "user_id" },
      );
      if (error) throw error;
    },
    onMutate: async (pet) => {
      await queryClient.cancelQueries({ queryKey: chaves.perfilPixel });
      const anterior = queryClient.getQueryData<PerfilPixel>(chaves.perfilPixel);
      queryClient.setQueryData<PerfilPixel>(chaves.perfilPixel, {
        pet: { ...pet, nome: pet.nome.trim() },
      });
      return { anterior };
    },
    onError: (_e, _pet, contexto) => {
      queryClient.setQueryData(chaves.perfilPixel, contexto?.anterior);
      toast.error("Não deu pra salvar o seu pet. Tente de novo.");
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: chaves.perfilPixel }),
  });
}
