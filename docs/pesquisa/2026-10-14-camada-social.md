# Camada social: salas pixel, chat, status, selos e foto

**Data:** 2026-10-14 · **Origem:** agente pesquisador (web + leitura do repositório) · **Status:** proposta, aguardando decisões do Renan e parecer jurídico.

Fatos do repositório que pesam nas decisões:

- `public_profiles` já existe, com `avatar_url` exigindo `https://`.
- `profiles` **não tem data de nascimento**, então hoje não há como aplicar regras por idade.
- O ADR-006 prevê Broadcast privado + Presence e desaconselha `postgres_changes` para chat.

## A. Avatares e pixel art

| Opção | Licença | Customização | Formato | Gera no cliente? |
|---|---|---|---|---|
| **DiceBear `pixel-art` / `pixel-art-neutral`** | arte **CC0**, código **MIT** ([licenças](https://www.dicebear.com/licenses/)) | cabelo, roupa, pele, óculos, chapéu, cores (seed ou opções) | SVG | **sim**, sem rede |
| **Universal LPC Spritesheet Generator** ([repo](https://github.com/liberatedpixelcup/Universal-LPC-Spritesheet-Character-Generator)) | varia por peça (CC0, CC-BY, **CC-BY-SA**, OGA-BY, **GPL**); exige crédito por autor via `CREDITS.csv` | muito rica, com animações de andar e sentar | spritesheet PNG 64×64 | sim, compondo camadas (com créditos dinâmicos) |
| **Kenney** ([Roguelike Indoor](https://opengameart.org/content/roguelike-indoor-pack), [RPG 1.700 tiles](https://opengameart.org/content/roguelikerpg-pack-1700-tiles)) | **CC0** | mesas, estantes, chão | tileset PNG 16×16 | cenário |
| **LimeZu Modern Interiors** ([itch](https://limezu.itch.io/moderninteriors)) | pago (~US$1,50), comercial com crédito, sem redistribuição (conferir o LICENSE do pacote) | biblioteca moderna e "aconchegante" | PNG | cenário |

**Recomendação**

- **Avatar:** DiceBear pixel-art, guardando só `avatar_config jsonb`. É só busto: fica atrás de um sprite de mesa.
- **Fase 2:** LPC filtrado para CC0/OGA-BY, se quiser corpo inteiro.
- **Cenário:** Kenney (CC0).
- **Renderização:** DOM/CSS (`image-rendering: pixelated`, escala inteira 2×/3×, cada avatar é um botão real, acessível). Canvas 2D só se a sala crescer. PixiJS não vale a pena aqui. Pausar com `document.hidden` e respeitar o movimento reduzido.

## B. Presença e música

**Limites do Supabase Realtime** ([limites](https://supabase.com/docs/guides/realtime/limits), [preços](https://supabase.com/docs/guides/realtime/pricing)):

| Plano | Conexões | Mensagens/s | Presence/s | Inclui | Excedente |
|---|---|---|---|---|---|
| Free | 200 | 100 | 20 | 2 mi msg/mês | — |
| Pro | 500 | 500 | 50 | 5 mi msg/mês | US$2,50 por milhão de mensagens |

- **Custo:** cada mensagem é cobrada **por destinatário**. Com 300 pessoas no pico, salas de 20 e 5 msg/min, isso dá uns US$40–90/mês acima dos US$25 do Pro.
- **Canais:** um canal privado por sala (`room:{id}`), com policies em `realtime.messages`. Exige JWT curto, para que expulsões e bloqueios façam efeito logo.
- **Presence (efêmero):** assento, emoji, "estudando agora", "foco até hh:mm" e música digitada. Leva só o que a pessoa escolheu mostrar.
- **Persistido:** status, mensagens e `focus_sessions`.

**Música "ouvindo agora"**

- **Spotify:** inviável. No modo de desenvolvimento são 5 usuários em allowlist e o dono precisa de Premium; o modo ampliado exige pessoa jurídica e 250 mil MAU ([quota](https://developer.spotify.com/documentation/web-api/concepts/quota-modes)).
- **Last.fm:** só uso não comercial ([ToS](https://www.last.fm/api/tos)).
- **Recomendado:** campo digitado à mão, com até 60 caracteres, validade de 4 h e filtro de palavrões. Desligado para menores.

## C. Chat

- **Tabela:** `room_messages` (corpo ≤ 500).
- **Envio:** RPC `send_room_message()`, que valida participação, rate limit (5 a cada 10 s e 60 por hora), bloqueio e filtro PT-BR (`blocked_terms`, texto normalizado).
- **Entrega:** por Broadcast, sem `postgres_changes`. Ao entrar na sala, carregam as últimas 50 mensagens.
- **Moderação:** denunciar (`reports`), bloquear (`blocks`), apagar a própria mensagem, e o moderador pode apagar e silenciar. Sem links na v1. Reforço opcional: OpenAI omni-moderation, avaliando a LGPD.
- **Retenção:** 30 dias (`pg_cron`). Mensagens denunciadas ficam 6 meses.
- **Escopo da v1:** só chat dentro da sala, **sem DM e sem chat entre salas**. Na v2, DM apenas entre maiores de 18 com amizade aceita pelos dois, e "ninguém me manda DM" ligado por padrão.

## D. Status e selos

**Status:** `status_text` (≤ 80), `status_emoji` e `status_expires_at`, com sugestões prontas ("Revisando", "Simulado", "Não perturbe").

**Selos** (bronze / prata / ouro), calculáveis com os dados que já existem:

| Selo | Critério (B / P / O) |
|---|---|
| Comedor de Livros | horas de foco: 10 / 100 / 500 |
| Maníaco dos Exercícios | revisões de flashcards: 500 / 5.000 / 25.000 |
| Memória de Elefante | ≥ 85% de acerto em 200 / 1.000 / 5.000 revisões |
| Constância é Tudo | melhor sequência: 7 / 30 / 100 dias |
| Coruja da Madrugada | sessões entre 22h e 2h: 10 / 50 / 200 |
| Galo Cantou | sessões entre 5h e 7h: 10 / 50 / 200 |
| Maratonista do Pomodoro | dias com ≥ 4 focos: 5 / 25 / 100 |
| Riscador Oficial | tarefas concluídas: 25 / 250 / 1.000 |
| Zero Pendência | semanas sem atraso: 1 / 5 / 20 |
| Escriba | notas criadas: 10 / 100 / 500 |
| Teia de Aranha | notas com ≥ 3 ligações: 5 / 30 / 100 |
| Fábrica de Cartões | cartões criados: 50 / 500 / 2.000 |
| Do Caderno ao Cartão | cartões nascidos de notas: 20 / 200 / 1.000 |
| Desbravador de Trilhas | trilhas com ≥ 5 h: 1 / 3 / 7 |
| Meta Batida | metas atingidas: 1 / 10 / 50 |
| Fim de Semana É Pra Isso | fins de semana com ≥ 60 min: 4 / 20 / 52 |
| Volta por Cima | voltou após ≥ 7 dias parado: 1 / 3 / 10 |
| Pausa Consciente | pausas respeitadas: 50 / 500 / 2.000 |
| Colega de Mesa | focos feitos numa sala: 5 / 50 / 200 |
| Fundador da Biblioteca | conta criada no primeiro ano |

**Regras**

- **Sem perda:** um selo conquistado nunca se perde, e não há ranking global.
- **Privados por padrão:** a pessoa escolhe até 3 selos para destacar no perfil. As horas exatas nunca são públicas.
- **Menores:** só selos de hábito e qualidade, sem horas brutas (o ECA Digital regula "recompensas por tempo de uso").
- **Cálculo:** tabela `user_badges`, função `private.recalc_badges(uid)` chamada no fim da sessão ou da revisão, mais um `pg_cron` noturno.

## E. Foto de perfil

- **Armazenamento:** bucket `avatars` público para leitura. A escrita só vale na pasta `{uid}/` (policy em `storage.objects`). Limite de 512 KB, apenas WebP ou JPEG.
- **No cliente:** recorte quadrado de 256×256 e conversão para WebP 0,85 pelo canvas, o que **remove EXIF/GPS**. O servidor revalida.
- **Nome do arquivo:** `{uid}/{hash}.webp`, um nome novo a cada troca, para o cache não mostrar a foto antiga.
- **Moderação:** a foto fica pendente (visível só para o dono) até ser aprovada (OpenAI omni-moderation ou Google SafeSearch). Também há denúncia.
- **Padrão:** o avatar pixel. A foto é opcional; **para menores, desligada**.

## F. Legal

Lei 15.211/2025 ([Planalto](https://www.planalto.gov.br/ccivil_03/_ato2023-2026/2025/lei/L15211.htm), [resumo do governo](https://agenciagov.ebc.com.br/noticias/202608/eca-digital-conheca-as-regras-de-protecao-de-criancas-e-adolescentes-no-ambiente-online)). Os artigos vêm de fontes secundárias: **conferir o texto oficial com um advogado**.

O que a lei traz, segundo essas fontes:

- configuração mais protetiva por padrão;
- conta de quem tem até 16 anos vinculada a um responsável (art. 24);
- restrição de contato de adultos;
- veto ao perfilamento;
- controle de recompensas por tempo de uso;
- canal de denúncia;
- multa de até 10% do faturamento (teto de R$ 50 mi).

O art. 9º veda a autodeclaração de idade para conteúdo impróprio a menores.

**Decisão prática sugerida:** a v1 social só para maiores de 18, com data de nascimento no onboarding. Se a autodeclaração basta é uma **pendência jurídica**.

## G. Fatias

1. **Perfil público v2:** status, avatar pixel e `birthdate` (portão de 18+).
2. **Foto de perfil:** bucket, compressão no cliente e moderação.
3. **Selos:** catálogo, `user_badges`, recálculo e vitrine.
4. **Salas com presença:** lista simples, sem pixel ainda.
5. **Chat de sala:** com moderação.
6. **Biblioteca pixel art:** cena Kenney, assentos e ficha da pessoa ao tocar.
7. **Música digitada** e o selo "Colega de Mesa".
8. **DM e salas teen:** depois do parecer do advogado.

**Antes de abrir ao público:** parecer jurídico sobre idade, termos e regras da comunidade, exclusão e exportação de conta, CAPTCHA, e plano Pro do Supabase.
