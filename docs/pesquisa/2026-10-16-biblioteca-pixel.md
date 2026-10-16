# Biblioteca Pixel do Athenas: pesquisa de arte, avatares, pets e técnica

Data: 2026-10-16

## Aviso de honestidade sobre o método

A ferramenta de abrir páginas (WebFetch) foi **bloqueada** neste ambiente: nenhuma página pôde ser aberta diretamente. Tudo abaixo vem de **resultados de busca (WebSearch)** que citam os links. Nenhum link foi aberto "de verdade". Por isso:

- Toda licença marcada "confirmada pela busca" foi lida em trechos de busca, não no arquivo LICENSE do pacote.
- Antes de baixar ou usar qualquer coisa, abra a página oficial e leia o arquivo de licença que vem dentro do pacote. Guarde uma cópia (print/PDF) da licença no dia em que baixar.
- O Pinterest não apareceu em nenhuma busca (nem pins, nem boards). Não consegui usá-lo.
- Onde está "não confirmado", é que eu não vi a licença com clareza.

## 1. Resumo executivo

**Recomendação: arte própria gerada por código (sprites em grade de pixels, estilo único do Athenas) para avatar e pets, e pacotes CC0 só como apoio de sala e referência de movimento.**

- **Avatar**: começar com **DiceBear "pixel-art"** (design CC0 1.0, código MIT; segundo a busca) como solução de 1 tarde para ter avatar personalizável (SVG, por semente). Depois, evoluir para um avatar "boneco" em camadas desenhado por nós (cabelo, pele, roupa, acessório) com 32 px.
- **Pets**: **não existe pacote pronto, com licença limpa, que cubra 6 a 12 espécies com idle/walk/sleep no mesmo estilo**. Os candidatos achados são fragmentados (vários artistas, licenças pouco claras ou sem sleep). Recomendo desenhar os pets nós mesmos (16 ou 24 px, 4 a 6 espécies no início: gato, cachorro, coelho, coruja, capivara, slime) e usar o "Orange Fat Cat" (CC0) e o "Tiny Creatures" (CC0, 16x16) só como referência de pose ou protótipo.
- **Sala**: montar com peças próprias simples (estante, mesa, abajur, tapete, janela) e usar pacotes CC0 da Kenney (Tiny Town/Tiny Dungeon, 16x16) como apoio. Evitar depender de LimeZu/Cup Nooble (exigem crédito e/ou compra, regras de redistribuição).
- **Técnica (uma só)**: PNG spritesheet + **CSS `steps()` + `image-rendering: pixelated`**, tudo em DOM/CSS, sem canvas nem PixiJS. Movimento do pet por `transform: translate` controlado por um pequeno laço em JS (máquina de estados). Respeitar `prefers-reduced-motion`.
- **Temas**: moldura/cenário na cor do tema; no tema P&B aplicar `filter: grayscale(1) contrast(1.1)` na cena. Sprites mantêm paleta própria.
- **Fatias**: (1) avatar DiceBear + nome + tela de escolha; (2) 1 pet (gato) com nome, idle e walk; (3) máquina de estados (andar, sentar, dormir, seguir o toque); (4) sala estática com 6 móveis; (5) mais 3 pets; (6) personalização do avatar em camadas próprias; (7) reduced-motion, bateria e tema P&B.

## 2. Tabela de candidatos

Nota 1 a 5 = adequação ao Athenas (licença limpa + estilo + esforço). "Pela busca" = não li o LICENSE oficial.

| Nome | Link | Licença | Uso comercial? | Atribuição? | Estilo / escala | Camadas / animações | Nota |
|---|---|---|---|---|---|---|---|
| DiceBear, estilo Pixel Art | https://dicebear.com/styles/pixel-art | Design CC0 1.0, código MIT (pela busca; página oficial citada nos resultados) | Sim | Não exigida (CC0) | Avatar de rosto/busto em pixel, SVG gerado por semente | Opções (cabelo, roupa etc.) por parâmetros, sem animação | 4 |
| Kenney (assets em geral) | https://kenney.nl/support | CC0, comercial permitido, crédito opcional (página de suporte da Kenney, via busca) | Sim | Não | 16x16 (Tiny Town/Dungeon), vários estilos | Sem avatar em camadas, sem animações ricas | 4 (para sala e apoio) |
| Tiny Creatures (Clint Bellanger) | https://opengameart.org/content/tiny-creatures e https://clintbellanger.itch.io/tiny-creatures | CC0 1.0 (pela busca) | Sim | Não (agradecido) | 16x16, contorno grosso, mais de 50 animais, 180 sprites | Estáticos (não vi animações) | 3 |
| Orange Fat Cat (megupets) | https://opengameart.org/content/orange-fat-cat | CC0 (pela busca) | Sim | Opcional | Gato laranja, spritesheet e frames soltos | Idle (2 frames), walk (19), jump, dead; sem sleep | 3 (só um gato) |
| Tiny Kitten Game Sprite (Segel) | https://opengameart.org/node/159726 (não confirmado qual nó; a busca citou o título) | CC0 (pela busca) | Sim | Não | Gatinho para plataforma | Idle, run, jump, hurt, dead | 2 |
| Customizable character pack (OGA) | https://opengameart.org/content/customizable-character-pack | CC0, derivado do Kenney RPG Urban Pack (pela busca) | Sim | Não | Pixel top-down, tamanho não confirmado | Arquivo GIMP em camadas (pele, sapato, calça, blusa, cabelo), 16 exemplos | 3 (bom modelo de camadas) |
| Puny Characters (OGA) | busca citou, link exato não confirmado | CC0 (pela busca) | Sim | Não | 16x16 em canvas 32x32 | Idle, walk, ataques | 2 (não é chibi de estudo) |
| Customizable Characters Top-Down 32x32 (schwarnhild) | https://schwarnhild.itch.io/customizable-characters-top-down-32x32 | Uso e edição comercial permitidos; proibido revender/redistribuir mesmo modificado (pela busca) | Sim | Não confirmado | 32x32 top-down | Cabelos (6), olhos (9), calças, camisas, chapéus, tons de pele; ainda em desenvolvimento | 3. Atenção: um app web que entrega os PNG ao navegador "redistribui" os arquivos? Risco jurídico, não confirmado |
| Cozy Room Interior v.1 [32x32] (paowieepixel) | https://paowieepixel.itch.io/cozy-room-interior-v1 | Comercial sim, redistribuição não (pela busca) | Sim | Não confirmado | 32x32, estilo Stardew | PNG, GIF, spritesheets | 3 (mesma ressalva de redistribuição) |
| Library & Inventory Top-Down (CraftPix) | https://craftpix.net/product/library-inventory-top-down-pixel-art-asset-pack/ | Pago, termos não lidos (não confirmado) | Não confirmado | Não confirmado | Biblioteca top-down com estantes, mesas, relógio | Personagens animados | 2 |
| LimeZu, Modern Interiors | https://limezu.itch.io/moderninteriors | Versão paga: uso comercial sim, sem revender/redistribuir, crédito com link para itch.io do LimeZu (comentários citando a licença, não o texto oficial) | Sim (paga) | Sim | 16/32/48 px, interiores e gerador de personagens | Muito completo, animações | 3: ótimo visual, mas crédito + restrição de redistribuição |
| Sprout Lands (Cup Nooble) | https://cupnooble.itch.io/sprout-lands-asset-pack | Conflitante: crédito exigido no pacote grátis, uso comercial parece exigir versão paga (comentários) | Não confirmado | Sim (grátis) | Estilo fazendinha fofo | Tiles e personagens | 2 |
| Pyxel Space, Animals (daniele-santana) | https://daniele-santana.itch.io/animals | Não confirmado | Não confirmado | Não confirmado | 12 animais (cão, gato, coelho, pássaro...), 4 direções | Idle e walk com 4 frames, US$ 7 | 2 |
| 25 Cute Pixel Art Animals 32x32 (fishenal) | https://fishenal.itch.io/pixel-animal | Pessoal e comercial; proibido revender/redistribuir avulso (pela busca) | Sim | Não confirmado | 32x32 | Animações não mencionadas | 2 |
| Capybaras! (exclusiveolive) | https://exclusiveolive.itch.io/capybaras-pixel-art-asset-pack | Não confirmado | Não confirmado | Não confirmado | Capivara, 16 animações | Inclui versão filhote; mínimo US$ 2 | 3 se a licença permitir |
| Universal LPC Spritesheet Character Generator | https://github.com/LiberatedPixelCup/Universal-LPC-Spritesheet-Character-Generator | Mistura por arte: CC0, CC-BY, OGA-BY, CC-BY-SA, GPL; gerador em GPL 3 (pela busca) | Depende da peça | Sim (exceto CC0); CC-BY-SA e GPL têm obrigações de compartilhar igual | 64x64, estilo RPG realista | Dezenas de camadas e animações (inclusive walk, sit, etc.) | 2: poderoso, mas risco de licença alto |
| vscode-pets (Tony Baloney) | https://github.com/tonybaloney/vscode-pets | Código MIT; sprites parecem ter licenças/créditos próprios de artistas (pela busca; não confirmado) | Código sim; arte não confirmado | Provável | Pets pixel animados (gato, cão, cobra, etc.) | Idle, walk, sentar, dormir, seguir cursor | 1 para arte, 5 como REFERÊNCIA de comportamento |
| Arte própria (grade de pixels em código) | n/a | Nossa (copyright do Athenas) | Sim | Não | O que desenharmos | Total controle | 5 (recomendada) |

## 3. Galeria de inspirações e referências

Nenhum link foi aberto diretamente (WebFetch bloqueado). Todos vêm de resultados de busca. Os marcados "[busca]" foram vistos só no título e trecho.

1. https://store.steampowered.com/app/3728940/ [busca] Muse Corner: sala pixel personalizável com trilha lo-fi, notas, tarefas e timer. Aprender: foco + decoração = hábito de voltar.
2. https://vaporlens.app/app/3511030/mini_cozy_room_lo_fi.md [busca] Mini Cozy Room: Lo-Fi: avatares que sentam em cadeira, cama, pufe. Aprender: o personagem "usa" os móveis.
3. https://paowieepixel.itch.io/cozy-room-interior-v1 [busca] Quarto 32x32 inspirado em Stardew. Aprender: paleta quente e objetos pequenos que contam história.
4. https://biruk-okami.itch.io/pixel-paintings-pack-framed-art-for-cozy-interiors/devlog/922745/-pixel-paintings-pack-a-new-cozy-decor-asset-pack [busca] Quadros de parede em pixel. Aprender: decoração de parede dá vida barata à sala.
5. https://craftpix.net/product/library-inventory-top-down-pixel-art-asset-pack/ [busca] Biblioteca top-down com estantes, mesas, relógio, velas. Aprender: lista de objetos essenciais de uma biblioteca.
6. https://toffeecraft.itch.io/cozy-room-pixel-asset-pack [busca] Pacote de quarto aconchegante. Aprender: composição de cômodo pequeno.
7. https://bidi-dev.itch.io/16x16-pixel-art-living-room-assets-sofas-coffee-table-rug [busca] Sala 16x16 com estantes, abajur e tapete. Aprender: escala 16 px é suficiente para ler "estante".
8. https://kauzz.itch.io/kauzz-pixel-tiles-cozy-living-room-asset-pack [busca] Mais um conjunto de sala. Aprender: variedade de tapetes e luminárias.
9. https://en.wikipedia.org/wiki/Neko_(software) [busca] História do Neko (cat que persegue o cursor e dorme). Aprender: um pet precisa de poucos estados para ter personalidade.
10. https://eliotakira.com/neko/ [busca] Neko em versão web. Aprender: como o gato segue o ponteiro e fica parado.
11. https://feedbagel.com/post/the-history-of-neko-from-1980s-ms-dos-to-macintosh-screen-pet [busca] Linha do tempo do Neko; a arte do Mac foi declarada domínio público pelo autor (segundo a busca). Aprender: arte mínima, apelo máximo.
12. https://github.com/chaoskagami/shimeji-ee [busca] Shimeji-ee: comportamentos em XML (ChaseMouse, Fall, Dragged, Thrown). Aprender: separar "ações" de "comportamentos" em dados.
13. https://github.com/tonybaloney/vscode-pets [busca] Pets animados na tela do editor. Aprender: máquina de estados simples, pets que reagem ao mouse.
14. https://opengameart.org/content/orange-fat-cat [busca] Gato CC0 com idle e walk. Aprender: quantos frames um walk suave usa (19, bem mais que o necessário).
15. https://opengameart.org/content/tiny-creatures [busca] 50+ animais 16x16 CC0 no estilo Kenney. Aprender: contorno grosso e poucas cores leem bem em tela pequena.
16. https://opengameart.org/content/customizable-character-pack [busca] Personagem em camadas CC0. Aprender: separação pele/cabelo/blusa/calça/sapato.
17. https://schwarnhild.itch.io/customizable-characters-top-down-32x32 [busca] Personalização 32x32. Aprender: lista de opções que o jogador espera (cabelo, olhos, pele, camisa).
18. https://exclusiveolive.itch.io/capybaras-pixel-art-asset-pack [busca] Capivara animada. Aprender: capivara é mascote sob medida para o Brasil.
19. https://dicebear.com/styles/pixel-art [busca] Gerador de avatar pixel. Aprender: avatar por semente determinística.
20. https://www.nathalielawhead.com/candybox/about-desktop-pets-virtual-companions-discussing-the-inhabitants-that-fill-the-void-of-our-digital-spaces [busca] Ensaio sobre desktop pets. Aprender: o apelo emocional (companhia, não utilidade).
21. https://wallpapers.com/library-aesthetic-pictures [busca] Fotos de bibliotecas aconchegantes. Aprender: luz quente e janelas para paleta.

**Não consegui abrir/ver**: Pinterest (nenhum pin apareceu), Habbo, Gather Town, Stardew Valley, Kairosoft, Lospec, Behance/Dribbble, Reddit r/PixelArt. Para essas referências, a descrição geral abaixo vem de conhecimento prévio, não de fonte confirmada: Habbo e Gather Town mostram sala em visão isométrica ou top-down com avatar andando; Stardew Valley tem pets simples e paleta quente; Kairosoft usa chibi pequeno e bem legível. Use só como inspiração e nunca copie arte nem marcas.

## 4. Técnica recomendada (uma abordagem simples)

**Spritesheet PNG + CSS `steps()` + `image-rendering: pixelated`, sem canvas e sem PixiJS.**

Por quê: para 1 avatar e 1 a 3 pets, o DOM aguenta bem, o CSS roda na GPU (transform e background-position animados por `steps()` não precisam de JS por frame), o navegador do celular já otimiza isso, e o código fica pequeno e fácil de entender. Canvas/PixiJS só fazem sentido quando houver dezenas de sprites (salas compartilhadas, futuro).

Princípios:
- Spritesheet horizontal, cada animação em uma linha; tamanho do frame fixo (ex.: 32x32). A quantidade de frames é o número do `steps()`.
- Ampliar com número inteiro (2x, 3x, 4x) e `image-rendering: pixelated` para não borrar.
- Movimento pelo mundo: `transform: translate3d(x, y, 0)` atualizado por um laço leve (`requestAnimationFrame` com pausa quando a aba está oculta). Estados: idle, andar, sentar, dormir, seguir o toque. Troca de estado a cada alguns segundos, de forma aleatória, com peso.
- Pré-carregar spritesheets (uma imagem por pet/avatar) e usar um sprite atlas pequeno.
- Bateria: poucos frames (2 a 4 por animação), `animation-play-state: paused` quando a aba/sala não está visível (`IntersectionObserver` + `visibilitychange`), baixa taxa (cerca de 6 a 8 fps basta, via `steps()` mais lento).
- Acessibilidade: com `prefers-reduced-motion: reduce`, mostrar frame estático e só mover o pet por ação do usuário.

Exemplo mínimo:

```css
.pet {
  width: 32px; height: 32px;
  background: url(/sprites/gato.png) 0 0 / auto 100%;
  image-rendering: pixelated;
  transform: scale(3);            /* inteiro */
  transform-origin: bottom left;
}
.pet[data-estado="andar"] {
  animation: andar 0.6s steps(4) infinite;
}
@keyframes andar { to { background-position-x: -128px; } } /* 4 frames x 32px */

@media (prefers-reduced-motion: reduce) {
  .pet { animation: none !important; }
}
```

(A técnica de `steps()` com `background-position` e a abordagem "opt-in" para reduced-motion aparecem em artigos como https://blog.teamtreehouse.com/css-sprite-sheet-animations-steps e https://flaviocopes.com/css-keyframes-reduced-motion.md, vistos só por trecho de busca. O detalhe de `image-rendering: pixelated` não veio das fontes: é conhecimento geral, confira no MDN.)

**Convivência com os 7 temas e o tema preto e branco**
- Moldura, fundo e "luz" da sala usam as variáveis CSS do tema (vidro/nebulosa). A arte dos sprites mantém paleta própria, com no máximo 16 cores por sprite.
- Tema P&B: aplicar `filter: grayscale(1) contrast(1.15)` no contêiner da cena (avatar, pet e sala). Para ficar "bonito" e não "lavado", desenhe sprites com bom contraste de luminância, não só de matiz.
- Alternativa mais fiel: paleta trocável. Se os sprites forem gerados por código (arte própria), cada cor do sprite é um papel (pele, cabelo, destaque) e pode ser trocada por tema sem filtro. Esta é uma vantagem forte da arte própria.

## 5. Arte própria vs. pacotes

**Arte própria em código (SVG ou grade de pixels gerada por programa)**

Prós:
- Licença limpa, 100% nossa; sem crédito obrigatório nem risco de CC-BY-SA/GPL.
- Consistência total (mesma escala, mesma grade, mesma paleta) entre avatar, pets e sala.
- Paleta recolorível por tema (inclusive P&B de verdade) e variações de cor dos pets quase de graça.
- Sprites minúsculos (matriz de caracteres/números), sem PNG pesado.
- Camadas de avatar como dados (cabelo + roupa + acessório) combináveis sem limite.

Contras:
- Esforço de desenho e de animação (poucos frames, mas alguém precisa desenhar). Qualidade depende de quem desenha.
- Menos "uau" imediato que um pacote profissional.
- Precisa de uma ferramenta/editor simples (pode ser um arquivo de texto com matriz e uma página de pré-visualização).

**Pacotes**

Prós: visual rico e rápido; animações prontas.
Contras: estilos diferentes entre pacotes (avatar de um autor, pet de outro, sala de um terceiro), termos de "não redistribuir" em quase todos os pagos (um app web serve os arquivos ao navegador, o que pode ser considerado redistribuição: **não confirmado**, pergunte ao autor), crédito obrigatório em alguns, dependência de terceiro.

**Caminho híbrido sugerido**: protótipo com DiceBear (CC0) e Kenney (CC0); em paralelo, desenhar 1 gato próprio e comparar. Se o dono gostar do resultado próprio, seguir assim e aposentar os pacotes.

## 6. Riscos de licença e o que fazer (checklist)

- [ ] Preferir **CC0** e MIT. Aceitar CC-BY só com tela de Créditos visível.
- [ ] **CC-BY-SA e GPL**: evitar nos assets. Exigem compartilhar "igual" obras derivadas, o que pode atingir os sprites combinados e talvez mais do app. O LPC mistura essas licenças por peça: só use com um filtro por licença e revisão jurídica.
- [ ] **"Pode usar comercialmente, não pode redistribuir"** (muito comum no itch.io): como o navegador baixa os PNG, pergunte por escrito ao autor se um app web conta como redistribuição. Guarde a resposta.
- [ ] **Crédito obrigatório**: criar página "Créditos" no app com nome do autor e link; manter um arquivo CREDITS no repositório.
- [ ] **Guardar prova**: print/PDF da página da licença e o arquivo de licença do pacote no dia do download; anotar versão e data.
- [ ] **Marcas**: Pokémon/Nintendo, Habbo, Tamagotchi e outros são só inspiração. Nada de copiar personagens, nomes, sprites ou "jeito reconhecível". Nome "Neko" como palavra é genérica, mas os sprites históricos têm origem própria (a arte do Mac de 1989 foi declarada domínio público pelo autor, segundo a busca, mas confirme antes de usar).
- [ ] **IA generativa**: nos EUA, imagens geradas só por prompt não têm copyright (decisão do tribunal federal em caso Thaler/DABUS e orientação do Copyright Office, vistas por busca). Ou seja, sprites 100% de IA podem ser copiados por qualquer um. Se usar IA, retoque à mão, guarde camadas/histórico e leia os termos da ferramenta. Cuidado também com assets de IA no mercado que imitam estilos de artistas específicos. Consultar um advogado antes de lançar é prudente. (No Brasil a regra é parecida em espírito, mas não pesquisei. Não confirmado.)
- [ ] **Assets "ripados"**: um comentário na busca alertou que um pacote de animais pode ser cópia de outro artista. Verificar procedência do autor antes de comprar.
- [ ] **Dados de usuário**: nome do pet é texto livre, então precisa moderar/filtrar (não é licença, mas é risco de produto).

## 7. Perguntas em aberto para o dono decidir

1. **Arte própria ou pacote?** Aceita investir tempo para desenhar (ou contratar um artista por encomenda, com contrato de cessão de direitos) em troca de licença limpa e consistência? Ou prefere visual rico agora, com crédito/risco?
2. **Quantas espécies de pet no lançamento** (sugestão: 4 a 6) e quais (gato, cachorro, coelho, coruja, capivara, slime?). Variações de cor entram na primeira versão?
3. **Visão da sala**: top-down (como Stardew) ou lateral/"palco" (mais fácil de animar e de ler no celular)? Recomendo lateral/palco.
4. **Escala dos sprites**: 16, 32 ou 48 px? (Sugestão: avatar 32, pet 16 a 24, sala em tiles de 16 ampliada 3x.)
5. **Quanto do avatar o usuário personaliza** (só cor e cabelo, ou roupas, acessórios, itens desbloqueáveis por estudo)? Isso muda o tamanho do trabalho de arte.
6. **Tema P&B**: sprites devem virar escala de cinza (mais simples) ou o dono quer um visual "retro 1-bit" desenhado de propósito? A segunda opção pede arte própria.

---
Fontes (todas por trecho de busca, nenhuma aberta diretamente): dicebear.com/styles/pixel-art, kenney.nl/support, github.com/tonybaloney/vscode-pets, limezu.itch.io/moderninteriors, github.com/LiberatedPixelCup/Universal-LPC-Spritesheet-Character-Generator, opengameart.org (Orange Fat Cat, Tiny Creatures, Customizable character pack), itch.io (schwarnhild, paowieepixel, fishenal, exclusiveolive, daniele-santana), en.wikipedia.org/wiki/Neko_(software), github.com/chaoskagami/shimeji-ee, blog.teamtreehouse.com, flaviocopes.com, yahoo.com e bakermckenzie.com (copyright e IA).
