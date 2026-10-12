# Mural (post-its, tarefas, títulos, grupos e setas) — design

**Data:** 2026-10-12 · **Status:** aprovado pelo Renan ("pode seguir e implementar td") · **Primeira de 4 peças** da área estilo Notion/Obsidian (depois: notas ligadas, flashcards, grafo).

## Intenção

Um quadro livre para organizar o estudo do jeito visual: colar post-its, trazer tarefas do app, escrever títulos, agrupar em molduras e ligar itens com setas (mapa mental / relacionamentos). Mobile-first (toque: arrastar, pinça), com o visual dos temas do Athenas.

**O que o Renan pediu:** vários murais; post-its, tarefas, setas, títulos e grupos; mover e personalizar; estilo Notion/Obsidian.
**Suposições:** pessoal (sem compartilhar até a camada social); sem colaboração em tempo real, imagens, desenho livre ou exportação nesta versão.

## Abordagem

**React Flow (`@xyflow/react` 12, MIT)**, carregado só na rota do quadro. Itens = componentes React nossos (temas e tokens do Athenas); a biblioteca cuida de pan/zoom/toque, arrastar, redimensionar, grupos (sub-flows) e arestas. Alternativas descartadas: quadro próprio (semanas de trabalho em toque/zoom/teclado) e tldraw (licença comercial e visual próprio).

## Dados

- `boards`: `id, user_id, title (1–80), color (paleta de 8), icon (lista fixa), track_id?, viewport jsonb {x,y,zoom}, archived_at, created_at, updated_at`.
- `board_items`: `id, user_id, board_id, kind ('nota'|'tarefa'|'titulo'|'grupo'), x, y, w, h, z, color, text, task_id?, parent_id?`, datas.
  - `text`: nota ≤ 2000, título ≤ 120, grupo ≤ 80. `task_id` só e obrigatório em `tarefa`.
  - FKs compostas `(user_id, …)`: mural, tarefa e grupo precisam ser da mesma pessoa; o grupo-pai precisa estar **no mesmo mural** e ser do tipo `grupo` (gatilho).
  - Tarefa apagada ⇒ `task_id = null` e o card mostra "tarefa removida". Grupo apagado ⇒ filhos ficam soltos (`parent_id = null`), não somem.
- `board_links`: `id, user_id, board_id, from_item, to_item, label? (≤60)`; as duas pontas no mesmo mural (gatilho), sem laço (`from <> to`), sem seta duplicada; apagar item apaga as setas.
- Limites: 500 itens e 1000 setas por mural (gatilho). Tamanhos: 40 ≤ w,h ≤ 4000.
- RLS forçada por dono em tudo; `anon` sem acesso.

## Telas e interação

- `/murais`: grade de cards (nome, cor, ícone, nº de itens, trilha), "+" cria mural (folha inferior com nome/cor/ícone/trilha). Arquivar com "Desfazer".
- `/murais/[id]`: quadro em tela cheia; fundo pontilhado; pinça = zoom, um dedo no vazio = mover; arrastar item = mover item; encaixe em grade de 16 px.
  - Barra flutuante: Post-it · Título · Grupo · Tarefa (lista das abertas) · Ligar (toca origem, depois destino) · Enquadrar tudo · Lista/Quadro.
  - Tocar seleciona (alças de redimensionar); "Editar" abre folha inferior (texto, cor, apagar). No computador: duplo clique edita no lugar; Delete apaga; setas do teclado movem 16 px.
  - Soltar um item dentro de um grupo o coloca no grupo (posição relativa); arrastar o grupo leva os filhos.
- Post-it: 8 cores (tokens por tema; no Preto e Branco viram cinzas), sombra suave. Card de tarefa = mesmo visual da lista (concluir no próprio card).
- Visão em lista (acessibilidade): itens agrupados por grupo, editáveis e apagáveis pelo teclado/leitor de tela.
- Entradas: seção "Murais" no Início e item "Murais" no menu do avatar (a barra inferior não muda).

## Salvamento e erros

Otimista. Criar aparece na hora; mover/redimensionar salva ao soltar; texto com espera de 500 ms; câmera ao sair. Falha ⇒ desfaz e avisa; apagar tem "Desfazer". Lógica pura testável: encaixe, limites, posição de item novo (centro visível), relativa↔absoluta em grupos, conversão banco↔quadro.

## Testes

Banco (PGlite: isolamento, FKs, gatilhos de mesmo mural/limites, cascatas), unitários (lógica pura), e2e no celular (criar mural, post-it, editar, mover, ligar, agrupar, apagar/desfazer, lista), axe nos 8 temas.
