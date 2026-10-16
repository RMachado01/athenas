# Sala pixel: pets, avatar e sala-biblioteca (etapa solo) — desenho

**Data:** 2026-10-16 · **Decisões do Renan no chat** (sem revisão do arquivo). Pesquisa: `docs/pesquisa/2026-10-16-biblioteca-pixel.md`.

## Intenção
Uma **sala-biblioteca em pixel art** onde a pessoa vê o seu **pet** (que ela escolhe e batiza) andando, sentando e dormindo, e interage com ele; mais tarde, o **avatar** dela estudando na mesa. Esta etapa é **só para a própria pessoa**: ninguém mais vê nada, então não exige base legal (ECA Digital/LGPD). Salas compartilhadas e chat ficam para a camada social (a partir de 14 anos).

## Decisões (Renan)
1. **Arte própria** (feita em código, licença limpa). Ele manda inspirações; as referências já enviadas: bibliotecas isométricas de madeira escura com luz âmbar; pets em pixel com **contorno grosso e poucas cores** (capivara, macaco, gatos).
2. **Pets do lançamento: 4.** Interpretação (a confirmar): **gato**, **capivara**, **macaco** e **gato-banana** (gatinho de fantasia de banana, desenho próprio). Cada espécie tem 3 a 4 variações de cor.
3. **Sala vista de lado** (como um palco). Depois migramos para a visão de cima.
4. **Preto e branco**: a **sala** vira escala de cinza; **pets (e avatar) continuam coloridos.**

## Arte própria: como se faz
- Cada sprite é uma **grade de caracteres** (uma letra por pixel) + **paleta** nomeada. Ex.: `o` contorno, `b` base, `s` sombra, `l` luz, `e` olho. Trocar a paleta troca a cor da variação sem redesenhar.
- Um renderizador transforma a grade em **SVG** (retângulos, `shape-rendering="crispEdges"`), nítido em qualquer escala. Quadros de animação viram uma **faixa horizontal** (spritesheet) mostrada com CSS `steps()`.
- Os pets são montados por **peças** (corpo, pernas em 2 poses, rabo em 2 poses, olhos abertos/fechados): poucos desenhos geram andar, parar e dormir.
- A **sala** é gerada por código (parede, piso de tábuas, janela com céu noturno e lua, estantes com lombadas coloridas, mesa com abajur, tapete, planta) e o brilho do abajur é em degraus, não em degradê.
- Uma **página de laboratório** (`/dev/pixel`) mostra todos os sprites e quadros, para revisar o desenho a olho.

## Comportamento do pet (máquina de estados)
Estados: **parado**, **andando**, **dormindo**, **feliz** (depois de um carinho). ("Sentado" ficou para uma fatia futura.) Função pura `proximoEstado(estado, sorteio)`, testada: a cada poucos segundos sorteia o próximo; anda para a esquerda/direita virando ao bater na borda; dorme mais depois de muito tempo sem toque. **Tocar no pet** = carinho (pulinho + coração + ele para e fica feliz). Respeita "reduzir movimento": o pet fica parado (sentado/dormindo) e o toque só mostra o coração.

## Dados (migração a aprovar)
`public.pixel_profiles (user_id pk → auth.users, pet_species, pet_variant, pet_name, avatar jsonb, created_at, updated_at)`. Checks: espécie e variação de listas fixas, nome de 1 a 24 caracteres sem quebras de linha. RLS forçado: só o dono lê e grava. O nome é só dele por enquanto; **quando virar social, passa por filtro de palavrões e denúncia**.

## Telas
- **/sala** (e `/dev/sala`; arte de todos os sprites em `/dev/pixel`): cena lateral com o pet; sem pet, convite "Adote um pet".
- **Adotar/editar**: folha com as 4 espécies (animadas), cores da espécie, campo de nome. Dá para trocar nome, cor ou espécie depois.
- Entrada pela aba **Estudo** (cartão "Sala"). A aba Estudo acende em `/sala`.

## Fatias
1. **(este PR)** motor de arte (grade → SVG → faixa animada), 4 pets com variações, sala lateral, estados do pet, adoção com nome, persistência, aba Estudo.
2. Avatar em camadas (cabelo, pele, roupa, acessório) sentado na mesa; criador de avatar.
3. Pet reage ao estudo (dorme se você não estuda, comemora ao concluir Pomodoro); pet "companheiro" opcional sobre a barra de navegação em outras telas.
4. Mais itens de decoração e ajustes de arte conforme as inspirações do Renan.
5. Sala de cima (visão alternativa).

## Testes
Unitários: renderizador de grade (dimensões, paleta, runs), montagem das peças, máquina de estados, catálogo (todas as grades com largura/altura coerentes, símbolos só da paleta). Banco: RLS, checks do nome/espécie. E2E no celular: adotar, nome, tocar, trocar. Acessibilidade (axe) nos 8 temas, com a sala em cinza no preto e branco.
