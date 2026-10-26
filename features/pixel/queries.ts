"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { chaves } from "@/lib/chaves-de-consulta";
import { usePerfil } from "@/lib/perfil";
import { criarClienteNavegador } from "@/lib/supabase/cliente";
import { AVATAR_PADRAO, lerAvatar, type AvatarSalvo } from "./avatar/modelo";
import { ehEspecie } from "./pets/catalogo";
import { ehAcessorio } from "./pets/pecas-extras";
import type { Especie } from "./pets/especies";

/** O pet da pessoa: espécie, cor, acessório e o NOME que ela escolheu. */
export interface PetEscolhido {
  especie: Especie;
  variacao: string;
  nome: string;
  /** Id do acessório (fone, oculos…) ou null = sem acessório. */
  acessorio: string | null;
}

export interface PerfilPixel {
  pet: PetEscolhido | null;
  /** Sempre existe: sem nada salvo, é o avatar padrão. */
  avatar: AvatarSalvo;
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
        .select("pet_species, pet_variant, pet_name, pet_accessory, avatar")
        .limit(1);
      if (error) throw error;
      const linha = data[0];
      const avatar = linha ? lerAvatar(linha.avatar) : AVATAR_PADRAO;
      if (!linha || !ehEspecie(linha.pet_species) || !linha.pet_variant || !linha.pet_name) {
        return { pet: null, avatar };
      }
      return {
        avatar,
        pet: {
          especie: linha.pet_species,
          variacao: linha.pet_variant,
          nome: linha.pet_name,
          // Um id que o app não conhece (dado antigo/estranho) vira "sem acessório".
          acessorio: ehAcessorio(linha.pet_accessory) ? linha.pet_accessory : null,
        },
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
          pet_accessory: pet.acessorio,
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
        avatar: anterior?.avatar ?? AVATAR_PADRAO,
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

/**
 * Grava o avatar (upsert só com a coluna `avatar`: o pet não é tocado). Otimista: a Sala já
 * mostra o avatar novo; se o banco recusar, volta o anterior e avisa.
 */
export function useSalvarAvatar() {
  const queryClient = useQueryClient();
  const { data: perfil } = usePerfil();

  return useMutation<void, Error, AvatarSalvo, { anterior: PerfilPixel | undefined }>({
    mutationFn: async (avatar) => {
      if (!perfil) throw new Error("Perfil ainda não carregou");
      const { error } = await criarClienteNavegador()
        .from("pixel_profiles")
        .upsert({ user_id: perfil.id, avatar: { ...avatar } }, { onConflict: "user_id" });
      if (error) throw error;
    },
    onMutate: async (avatar) => {
      await queryClient.cancelQueries({ queryKey: chaves.perfilPixel });
      const anterior = queryClient.getQueryData<PerfilPixel>(chaves.perfilPixel);
      queryClient.setQueryData<PerfilPixel>(chaves.perfilPixel, {
        pet: anterior?.pet ?? null,
        avatar,
      });
      return { anterior };
    },
    onError: (_e, _a, contexto) => {
      queryClient.setQueryData(chaves.perfilPixel, contexto?.anterior);
      toast.error("Não deu pra salvar o seu avatar. Tente de novo.");
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: chaves.perfilPixel }),
  });
}
