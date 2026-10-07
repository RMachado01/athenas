# ADR-006: Grupos de estudo e camada social (multiusuário desde o início)

**Status:** Proposed
**Date:** 2026-10-07
**Deciders:** Renan

## Context

O escopo mudou: o Athenas deixa de ser "app pessoal que pode virar multiusuário" e passa a ser **multiusuário por design**, com:

- **Grupos de estudo** que o usuário cria e administra;
- **Grupos públicos** que qualquer pessoa pode descobrir por **tema ou objetivo** e ingressar;
- **Troca de ideias** entre membros.

Isso muda a natureza do banco: até aqui **todo dado tinha um único dono** (`user_id = auth.uid()`). Agora existem dados **compartilhados com condição** (só quem é membro vê) e dados **públicos** (descoberta). É a parte do projeto onde um erro de RLS deixa de ser "bug" e vira **vazamento de privacidade entre pessoas reais**.

Riscos novos que entram junto com "social":

- **Privacidade:** o estudo é pessoal (tarefas, notas, horários). Compartilhar com um grupo precisa ser **escolha explícita e granular**, nunca padrão.
- **Conteúdo gerado por usuário:** spam, assédio, conteúdo ilegal → precisa de denúncia, bloqueio, moderação, termos.
- **Tempo real e custo:** chat ao vivo é a feature mais cara de operar e a que mais cria dívida (não lidas, notificações, moderação).
- **Legal (Brasil):** LGPD (consentimento, exclusão e exportação de dados, controlador) e regras sobre menores online. *Não sou advogado: tratar como pendência a validar com fonte jurídica antes de abrir publicamente.*
- **Escopo:** o risco nº 1 do system-design ("o projeto cresce e rouba o tempo dos estudos") **cresce muito**; precisa de portões de fase claros.

## Decision

### 1. Dois mundos de dados, com regras diferentes

| Mundo | Quem vê | Mecanismo |
|---|---|---|
| **Pessoal** (tarefas, notas, sessões, metas, blocos, tokens) | só o dono | RLS `user_id = auth.uid()` (ADR-002) — **nunca** exposto a grupos diretamente |
| **Social** (grupos, membros, posts, comentários, convites) | membros (e metadados públicos de grupos públicos) | RLS por **pertencimento** via funções auxiliares |

**Regra de ouro:** nenhuma policy do mundo pessoal menciona grupo. A única ponte entre os mundos são **agregados consentidos** (item 3).

### 2. Modelo social (tabelas novas, Fase 3)

- `public_profiles (user_id pk, handle citext unique, display_name, avatar_url, bio, created_at)` — identidade pública mínima. **`profiles` continua privado** (fuso, metas, preferências). Separar cedo evita expor sem querer campos privados.
- `groups (id, owner_id, slug unique, name, description, visibility 'public'|'private', join_policy 'open'|'request'|'invite', max_members, language, archived_at, created_at, search tsvector)`.
- `topics` (catálogo curado: SQL, Power BI, Python, Inglês, Concursos, ENEM…) e `group_topics (group_id, topic_id)`; mais `groups.objective` (texto livre, ex.: "Passar na PL-300 até dezembro") para **objetivo**.
- `group_members (group_id, user_id, role 'owner'|'admin'|'moderator'|'member', status 'active'|'pending'|'banned'|'left', share_level 'none'|'summary'|'detail', joined_at, muted_until)` — **chave primária composta**; `share_level` é o consentimento por grupo.
- `group_invites (id, group_id, code_hash, created_by, expires_at, max_uses, uses)` — o código só aparece uma vez; no banco fica o hash.
- `posts (id, group_id, author_id, kind 'text'|'question'|'resource'|'win', body, parent_id null, pinned, deleted_at, edited_at)` — **mural com respostas em fio** (um nível de aninhamento) + `reactions (post_id, user_id, kind)`.
- `reports (id, reporter_id, target_type, target_id, reason, status)` e `blocks (blocker_id, blocked_id)`.
- Chat ao vivo e salas de estudo: **ver "Fases"** (não entram antes do mural).

### 3. Compartilhar progresso: só agregado, só com consentimento

Membros **não** leem `focus_sessions` uns dos outros. Em vez disso:

- Funções `security definer` (com `search_path` fixo) como `fn_group_leaderboard(group_id, period)` e `fn_group_activity(group_id)`:
  1. verificam que o chamador é membro **ativo**;
  2. devolvem **apenas** o que cada membro consentiu (`share_level = 'summary'` → horas da semana e streak; `'detail'` → também trilha e "estudando agora"; `'none'` → não aparece);
  3. nunca devolvem título de tarefa, notas, horários exatos nem eventos do Google.
- Padrão do `share_level`: **`none`** — o usuário liga conscientemente ao entrar. A UI explica em linguagem simples *o que* o grupo verá.
- Testes pgTAP: usuário fora do grupo, usuário `none`, usuário banido, usuário que saiu — nenhum aparece; histórico de quem saiu deixa de aparecer.

### 4. RLS de pertencimento (padrão seguro)

- Funções auxiliares `stable security definer` com `search_path` fixo, **em schema não exposto pela API (`private`)**: `private.is_group_member(gid)`, `private.has_group_role(gid, roles[])`. Índice obrigatório em `group_members (user_id, group_id)`. As policies chamam `(select is_group_member(group_id))` — isso evita **recursão infinita** (policy de `group_members` lendo `group_members`) e permite cache por query.
- `groups`: `select` do **metadado** de grupo `public` para qualquer `authenticated` (e, opcionalmente, `anon` só para página de SEO `/g/{slug}` via view restrita); grupos `private` só para membros.
- **Conteúdo (`posts`) só para membros ativos**, mesmo em grupo público. Motivo: reduz exposição de dados pessoais, scraping e responsabilidade de moderação. Quem quiser ler, entra.
- Ingresso: `open` → `insert` direto como `member` (via função, que checa lotação e banimento); `request` → fica `pending` até um admin aprovar; `invite` → função consome o convite (valida hash, validade e usos).
- Papéis: `owner` (único; transferir antes de sair), `admin` (gerencia membros), `moderator` (apaga posts, silencia), `member`. Nenhuma operação de papel confia no cliente: tudo via função que verifica o papel.
- **Bloqueios:** `blocks` esconde posts e perfis do bloqueado para quem bloqueou (filtro na view/consulta, não na policy, para não custar performance).

### 5. Descoberta de grupos públicos

- **Busca por tema/objetivo:** Postgres full-text em português (`tsvector` com `to_tsvector('portuguese', …)`, coluna gerada + índice GIN) + `pg_trgm` para tolerar erro de digitação. *Normalização de acentos (`unaccent`) NÃO está garantida: `unaccent()` não é `IMMUTABLE` e exige wrapper — validar antes de usar.* filtros por `topics`, idioma, tamanho e atividade recente. **SQL treinável e bom para portfólio.**
- Ranking inicial: relevância textual + atividade recente (posts/sessões agregadas dos últimos 7 dias) + vagas disponíveis.
- **Depois (opcional):** `pgvector` para "grupos parecidos com o seu objetivo" (embeddings do texto de objetivo). Só se a busca textual se mostrar insuficiente — não é MVP.

### 6. Tempo real: o que usar

- **Mural e feed:** *pull* + atualização por TanStack Query com `refetch`/invalidação; Realtime só para avisar "há novos posts".
- **Chat/salas ao vivo (fase posterior):** **Supabase Realtime Broadcast em canais privados** com autorização por RLS em `realtime.messages`, e **Presence** para "estudando agora". Evitar `postgres_changes` em tabelas de mensagens com muitos assinantes: cada evento vira uma leitura de RLS **por assinante**, processada em **uma única thread** (confirmado na doc do Supabase). Broadcast privado e "Broadcast from Database" estão em *public beta*; a policy em `realtime.messages` deve ser simples (`realtime.topic()` + `private.is_group_member`). No plano Free: **200 conexões, 100 msgs/s, 20 presence msgs/s** — uma sala ao vivo esgota isso cedo. Limites do plano gratuito de conexões simultâneas aplicam.
- Persistir mensagens no Postgres (histórico) e usar Broadcast só como **entrega**.

### 6b. Notificações

In-app (tabela `notifications` + badge) primeiro; **e-mail** transacional/resumo (provedor com plano gratuito, ex.: Resend) depois; **Web Push** na fase do ADR-004. Preferências por grupo (silenciar).

### 7. Segurança de conteúdo e abuso

- Texto de post em **Markdown restrito** (sem HTML cru), renderizado com sanitização; limites de tamanho no `CHECK` do banco.
- **Rate limit** por usuário nas escritas sociais (trigger/função que conta inserções recentes, e proteção na borda); **anti-bot no cadastro** (CAPTCHA — ex.: Cloudflare Turnstile).
- **Denunciar / bloquear / sair / silenciar** presentes desde o primeiro dia do social; fila simples de `reports` para o `owner`/`admin` do grupo e, para abusos graves, para você (admin da plataforma).
- **Termos de uso, política de privacidade e regras da comunidade** antes de abrir grupos públicos.
- **Direitos do titular (LGPD):** botão "exportar meus dados" e "excluir minha conta" (cascata correta, mantendo anonimizado o que for necessário para o grupo, ex.: posts → "Usuário removido").
- **Idade mínima** e consentimento: definir regra (ex.: 18+ no início, para evitar o terreno de menores) — pendência a validar juridicamente.
- **Anexos/imagens:** fora do primeiro corte (Storage + varredura + limites); só avatar na primeira versão.

### 8. Fases (reavaliando o roadmap — veja o plano)

1. **Fase 0 (fundação, já multiusuário):** auth, `profiles`/`public_profiles`, RLS, CI, deploy.
2. **Fase 1 (MVP pessoal):** tarefas, trilhas, foco, dashboard. **Portão:** você usa o app de verdade por 2 semanas.
3. **Fase 2:** calendário, metas, Google (importar → exportar).
4. **Fase 3 (grupos, corte 1):** criar/entrar/sair, descoberta pública, papéis, convites, **ranking/atividade consentida**, mural com respostas, denúncia/bloqueio, notificações in-app.
5. **Fase 4:** salas de estudo ao vivo (Presence + **timer compartilhado** de pomodoro em grupo — *body doubling*), chat, desafios coletivos, Web Push, gamificação social, fila de escrita offline.

**Não construir social antes do portão da Fase 1**: um app social vazio (sem massa de usuários) é pior do que um app pessoal excelente. O diferencial inicial do Athenas é a **experiência pessoal luxuosa**; os grupos amplificam quem já usa.

## Options Considered

### Option A: Grupos como camada própria, com agregados consentidos e RLS de pertencimento (escolhida)

| Dimensão | Avaliação |
|---|---|
| Complexidade | Alta (modelagem + testes de privacidade) |
| Custo | Zero no início; sobe com usuários/tempo real |
| Escalabilidade | Boa com índices e funções; chat exige cuidado |
| Familiaridade | Média — ótimo treino de SQL/RLS |

**Prós:** privacidade por construção; descoberta por SQL; evolui por fases; não toca no mundo pessoal.
**Contras:** muito trabalho de teste; várias tabelas; moderação é trabalho humano contínuo.

### Option B: Compartilhar diretamente linhas pessoais com grupos (policies "ou é membro do grupo")

**Contras:** espalha condições de grupo por todas as tabelas pessoais; fácil vazar tarefas/notas; abandonada.

### Option C: Integrar com Discord/Telegram/WhatsApp em vez de construir chat

**Prós:** zero custo de chat, usuários já estão lá; **ótima alternativa para a Fase 3** (botão "abrir grupo no Discord/WhatsApp").
**Contras:** perde a integração com progresso e a identidade do app; mas serve como **atalho barato** antes do chat próprio.

### Option D: Serviço de chat gerenciado (Stream, Sendbird, Ably)

**Prós:** chat completo pronto.
**Contras:** custo por usuário ativo, dados fora do Postgres, lock-in; reconsiderar só se o chat virar o centro do produto.

## Trade-off Analysis

Escolhemos **privacidade e simplicidade operacional** em vez de "tudo social já". Dividir em **mundo pessoal (inviolável)** e **mundo social (por pertencimento)**, ligados só por **agregados consentidos**, deixa a regra de segurança *explicável em uma frase* — e o que é explicável é testável. Adiar chat ao vivo é a maior economia: o mural em fio entrega "troca de ideias" com uma fração da complexidade, e a Option C (link para Discord/WhatsApp) pode cobrir o ao vivo até haver demanda real.

## Consequences

- **Mais fácil:** descobrir grupos por SQL; crescer por camadas; explicar privacidade ao usuário.
- **Mais difícil:** testes de RLS (matriz papéis × status × visibilidade); moderação; custos de Realtime/e-mail; obrigações legais.
- **Obrigatório antes de abrir ao público:** termos, privacidade, denúncia/bloqueio, exclusão de conta, limite de taxa, CAPTCHA.
- **A revisitar:** busca semântica (`pgvector`); chat próprio vs. integração; moderação assistida; monetização (muda o plano de hospedagem — Vercel Hobby não permite uso comercial).

## Action Items

1. [ ] Desenhar as telas sociais no design system (Grupos, Descobrir, Página do grupo, Mural, Convites, Perfil público, Denunciar) — **antes da Fase 3**.
2. [ ] Fase 0: já separar `profiles` (privado) de `public_profiles`.
3. [ ] Matriz de testes pgTAP social (papéis × status × visibilidade × `share_level`).
4. [ ] Redigir termos, política de privacidade e regras da comunidade; decidir idade mínima (validar juridicamente).
5. [ ] Escolher provedores: CAPTCHA, e-mail transacional, rate limit na borda.
6. [ ] Estimar custos por faixa de usuários (Supabase/Vercel/e-mail) e definir o gatilho para sair do plano gratuito.


---

## Emenda 1 (2026-10-07) — resultados da pesquisa paralela e novas decisões

Fonte: `docs/pesquisa-paralela-2026-10-07.md`.

1. **Modelo de planos ("pacotes") desde já:** lançamento com **todas as funcionalidades liberadas**, mas com `plans` e `entitlements` parametrizáveis (limites por plano: nº de grupos, tamanho de grupo, salas ao vivo, histórico). Hoje todo usuário está no plano "completo"; cobrar depois exige só trocar o plano, não refatorar.
2. **Ranking (R3):** herói = esforço do próprio usuário, sem pódio; ordenação padrão por **constância** (dias estudados), horas como alternativa; janela semanal; sem rebaixamento. **Meta coletiva do grupo** (desafio semanal) como alternativa cooperativa.
3. **Sala ao vivo (R4):** entrar na sala é **consentimento por sessão**, que expira ao sair e **não** altera o `share_level` do grupo.
4. **Bloqueio (R7):** o bloqueado não aparece em posts/perfil de quem bloqueou, mas permanece nos números agregados do ranking, sem link para o perfil. Explicar isso no modal.
5. **Posts fixados:** máximo 2; só moderador ou acima fixa.
6. **Onboarding (R8):** perguntar o tema; **não** usar trilhas privadas para sugerir grupos sem permissão.
7. **Idade mínima / ECA Digital:** a lei pode exigir verificação de idade mais robusta que autodeclaração para serviços de provável acesso por menores. **Bloqueante para abrir grupos públicos**: decidir com validação jurídica (ver pesquisa, seção 4).
