# ADR-007: Biblioteca pixel — sala vista de cima, avatar e pet em Canvas 2D, arte CC0

**Status:** Proposed
**Date:** 2026-10-15
**Deciders:** Renan

## Context

O roadmap prevê uma "Biblioteca pixel": salas de estudo em pixel art, avatares e pets que andam pela tela. O Renan trouxe referências visuais (salas isométricas góticas, uma sala vista de cima com lareira, folhas de animação de personagens) e escolheu o caminho abaixo.

Três coisas pesam na decisão:

1. **O custo de animar depende da perspectiva.** Uma ilustração isométrica é uma imagem fixa: para o avatar passar atrás de uma estante, cada sala precisa de camadas de profundidade e de caminhos desenhados à mão. Uma sala vista de cima é uma grade de tiles, e andar, sentar e desviar de móveis é simples.
2. **As imagens de referência não podem virar asset.** Vêm do Pinterest, de autoria desconhecida, e ao menos uma se declara gerada por IA. Servem de mood board. Imagens de IA têm direito autoral incerto e estilo inconsistente entre salas.
3. **O público inclui 14 a 17 anos** (ECA Digital, ver ADR-006). Presença em tempo real e perfil exigem cuidado jurídico que o roadmap já deixa para depois.

> Nota de método: a pesquisa que alimenta este ADR foi feita por um agente com a rede restrita. Os pontos marcados **(a confirmar)** vieram de resultados de busca, não de páginas abertas e lidas. Confirmar na fonte oficial antes de implementar.

## Decision

**Primeira versão: uma sala só do usuário, um avatar e um pet. Sem multiusuário.**

1. **Perspectiva:** vista de cima, em grade de tiles. O isométrico fica como possível sala premium futura.
2. **Renderização:** **Canvas 2D puro** (cerca de 150 linhas), sem engine. Carregado num componente cliente com `dynamic(..., { ssr: false })`.
3. **Arte:** pacotes **CC0** como base (Kenney e similares **(a confirmar)**), recoloridos numa paleta própria. Todo asset CC-BY (se houver) entra numa tela de créditos. As imagens do Pinterest ficam fora do repositório.
4. **Integração com o Foco:** é o que dá sentido ao recurso.
   - Foco em andamento: avatar sentado à mesa, pet dormindo.
   - Pausa: avatar levanta e anda, pet brinca.
   - Sessão concluída: breve comemoração.
   O desenho lê o estado do timer que já existe (`features/focus`) e não cria um segundo relógio.
5. **Dados:** escolha de sala, avatar (camadas: corpo, cabelo, roupa, acessório) e pet ficam em colunas novas de `profiles` (privado), validadas por Zod e por `check` no banco. **Nada disso aparece em `public_profiles`** até o social (ADR-006) ser liberado.
6. **Sala como dado:** cada sala é um JSON versionado com camadas, zonas andáveis e assentos, sem código por sala. Assim, adicionar uma sala é adicionar arte e um arquivo de dados.

## Options Considered

### Option A: Canvas 2D puro, vista de cima (escolhida)
| Dimensão | Avaliação |
|---|---|
| Peso | 0 KB de biblioteca |
| Bateria | Controlável: poucos quadros por segundo, pausa com a aba oculta |
| Acessibilidade | Canvas escondido do leitor de tela, com texto equivalente ao lado |
| Custo de arte | Baixo: tiles pequenos e reaproveitáveis |

**Prós:** menor peso, controle total, simples de testar a lógica (máquina de estados em funções puras, como o timer).
**Contras:** escrevemos o laço de desenho, a colisão e a ordenação de desenho.

### Option B: Kaplay (ou outra engine leve)
Cerca de 70 KB gzip **(medido pelo agente no arquivo completo; versão com tree-shaking não medida)**. Traz cenas, colisão e sprites prontos. Bom plano B se a lógica crescer (muitos pets, interação entre avatares).

### Option C: PixiJS ou Phaser
Cerca de 237 KB e 352 KB gzip **(medidos, arquivos completos)**, WebGL. Excesso para dez entidades pequenas, com mais consumo de bateria.

### Option D: Salas isométricas ilustradas
Visual mais marcante, porém exige profundidade por camada e caminho desenhado por sala. Custo de arte alto, difícil de manter consistente. Adiado.

## Trade-off Analysis

A escolha foi **começar pelo formato que prova a ideia mais barato**. O risco do produto não é gráfico, é saber se um avatar sentado ligado ao Foco motiva alguém a estudar mais. Vista de cima + Canvas puro + arte CC0 responde isso em poucas semanas e sem dívida jurídica. Se a ideia pegar, trocamos a arte (artista contratado) e, se preciso, a engine, sem mexer no modelo de dados, porque a sala é só um JSON.

## Consequences

- **Mais fácil:** peso mínimo, licença limpa, lógica testável, sem impacto no banco além de colunas em `profiles`.
- **Mais difícil:** a arte CC0 tem visual menos único; recolorir para os 7 temas dá trabalho (decisão em aberto abaixo).
- **A revisitar:** contratar pixel artist se o recurso virar marca do produto; Kaplay se a lógica crescer; salas compartilhadas só depois do portão legal.

### Requisitos não negociáveis
- **Movimento reduzido:** com `prefers-reduced-motion`, sprites ficam parados. Além disso, um botão "Pausar animações" (animação contínua por mais de 5 s pede controle de pausa, WCAG 2.2.2 **(a confirmar)**).
- **Desempenho:** laço limitado a cerca de 8 a 12 quadros por segundo; pausa com `document.hidden`; escala por inteiros com `image-rendering: pixelated`; atlas único por sala.
- **Leitor de tela:** canvas com `aria-hidden`; texto equivalente ao lado ("Você está estudando · 12:30 · pet dormindo"); toda ação por botão e teclado.
- **Créditos:** `docs/creditos-de-arte.md` lista origem e licença de cada asset; CC-BY aparece numa tela de créditos no app.
- **Privacidade:** sem foto nem nome real no avatar; nada de presença exposta a terceiros nesta versão.

## Decisões em aberto
1. **Recolorir por tema:** trocar a paleta no build (um atlas por tema, mais peso) ou em tempo de execução no canvas (mais simples, custa um pouco de CPU na carga).
2. **Qual pacote CC0 como base**, depois de abrir as páginas e confirmar a licença exata de cada um.
3. **Qual pet primeiro** (gato é o mais disponível em CC0 **(a confirmar)**).

## Action Items
1. [ ] Liberar `opengameart.org` e `kenney.nl` na rede do ambiente, ou o Renan baixar os pacotes, e confirmar a licença na página de cada um.
2. [ ] Escolher a sala, o avatar e o pet iniciais; registrar em `docs/creditos-de-arte.md`.
3. [ ] Definir o formato JSON da sala (camadas, zonas andáveis, assentos) com um teste de unidade que o valida.
4. [ ] Migration: colunas de sala, avatar e pet em `profiles`, com `check` e teste de banco.
5. [ ] Máquina de estados do avatar e do pet (funções puras + testes), ligada ao estado do timer.
6. [ ] Componente Canvas com movimento reduzido, pausa por aba oculta e texto equivalente; testes e2e e de acessibilidade (axe).
7. [ ] Voltar ao roadmap: esta decisão só vale como "Aceita" depois do OK do Renan.
