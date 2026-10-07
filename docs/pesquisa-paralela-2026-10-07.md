# Athenas — Síntese da pesquisa paralela (5 agentes)

7 de outubro de 2026

Cinco agentes de pesquisa trabalharam em paralelo e somente leitura. **Atenção à confiança de cada fonte:** WebSearch/WebFetch falharam em parte das rodadas (erro transitório do classificador de permissões).

| Agente | Fonte real | Confiança |
|---|---|---|
| UX de redes sociais de estudo | **Conhecimento prévio** (web falhou) | Média — padrões gerais; detalhes de produtos podem ter mudado |
| Conformidade (LGPD/ECA Digital/Marco Civil) | **Conhecimento prévio** (web falhou) | Média-baixa — **datas e números marcados (*) precisam de checagem; exige advogado** |
| Supabase para o social | Índice oficial `search_docs` do Supabase | **Alta** (itens de trigram/unaccent marcados como não confirmados) |
| Versões e compatibilidade da stack | npm registry, nodejs.org, docs oficiais, GitHub | **Alta** (itens "incerto" listados) |
| Telas sociais no design system | Leitura dos seus arquivos + ADRs | Alta (é proposta de design, não fato externo) |

---

## 1. Telas sociais (proposta do agente de design)

10 telas especificadas em wireframe textual, com estados, movimento (tokens existentes), a11y e microcopy: **Grupos, Descobrir, Página do grupo, Mural, Ranking/Atividade (consentido), Criar/Gerenciar, Perfil público + Privacidade, Denunciar/Bloquear, Onboarding social, Sala ao vivo**. Mais ~25 componentes novos (GroupCard, PostItem, LeaderboardRow, PrivacyToggle, ConsentSheet, SharedTimer…).

**Ordem de mockups recomendada:** catálogo de componentes → Página do grupo (Mural) → Grupos → Descobrir → Privacidade/Consentimento → Ranking → Denunciar → Gerenciar/Criar → Perfil → Onboarding → Sala ao vivo (por último).

### Decisões que travam o desenho (preciso de você)

| # | Questão | Minha recomendação |
|---|---|---|
| R1 | **Nav mobile:** já são 5 slots (com FAB de Foco). Onde entram *Grupos*? | Trocar *Metas* por *Grupos* na barra e levar Metas para o Início/menu "Mais". |
| R3 | **Ranking:** horas absolutas favorecem quem tem mais tempo livre e contradiz "discrição". | Herói = **seu próprio esforço** (sem pódio); ordenação padrão por **constância** (dias estudados) com horas como alternativa; janela semanal que zera; sem rebaixamento. |
| R4 | **Sala ao vivo × `share_level`:** quem está em `none` aparece na sala? | Entrar na sala = **consentimento por sessão**, que expira ao sair e não muda o `share_level` do grupo. |

Outros riscos úteis: **R8** — não usar as trilhas privadas para sugerir grupos sem permissão (perguntar o tema no onboarding); **R12** — o design system proíbe emoji de celebração, então reações usam ícones Lucide; **R6** — limite de 2 posts fixados.

---

## 2. Supabase para o social (alta confiança) — correções às ADRs

**Confirmado na documentação oficial**
- Realtime Broadcast/Presence autorizados por RLS em `realtime.messages`; canal privado (`private: true`); "Broadcast from Database" (`realtime.send` / `broadcast_changes`) — **ambos em public beta**.
- `postgres_changes` escala mal: cada evento vira 1 leitura de RLS por assinante, processado em **uma única thread**.
- **Limites Realtime (Free):** 200 conexões simultâneas, 100 msgs/s, 20 presence msgs/s. (Pro: 500 / 500 / 50.)
- Funções auxiliares de RLS devem ficar em **schema não exposto** (`private`), embrulhadas em `(select ...)`; índice em `group_members(user_id, group_id)`.
- `security_invoker = true` em views exige Postgres 15+.
- **Free:** sem backup restaurável; projeto pausa após 7 dias; **SMTP padrão só envia para membros da organização** → precisa de **SMTP próprio mesmo no beta**. Pro: US$ 25/mês.
- Auth: `before_user_created` (beta) serve para allowlist/convite; CAPTCHA (Turnstile/hCaptcha) via `captchaToken`.
- Next 16: `proxy.ts` + `@supabase/ssr` (`getAll`/`setAll`), validar com `getClaims()`/`getUser()`, nunca `getSession()` no servidor.

**Correções aplicadas / a aplicar**
- ADR-006 §4: helpers `is_group_member`/`has_group_role` em schema `private`. ✅ (aplicado abaixo)
- ADR-006 §6: Realtime Broadcast privado está em beta; usar policy simples com `realtime.topic()`; citar 200 conexões/100 msg/s.
- ADR-006 §5: **remover `unaccent` da lista** até validar (não é `IMMUTABLE`; precisa de wrapper). Ranking de busca combinando `ts_rank` + `similarity` é hipótese a testar.
- ADR-001/Plano: **SMTP próprio desde o primeiro convidado** (ex.: Resend), `proxy.ts`, backup externo (`supabase db dump`).

---

## 3. Stack — versões a fixar (alta confiança, verificado no registry hoje)

Node **24 LTS** · pnpm **12.x** · Next **16.4** (Turbopack padrão, `proxy.ts`, `await` em `cookies()/params`) · React **19.3** · Tailwind **4.3** (`@tailwindcss/postcss`, `@theme inline`) · `motion` **14** (`motion/react`) · supabase-js **2.117** · `@supabase/ssr` **0.12** · TanStack Query **5** · Zustand **5** · RHF **7** + Zod **4** · Vitest **5** · Playwright **1.63** · Prettier **3.9**. Fixar versões exatas; lockfile só depois de validar a combinação.

**Riscos reais (precisam de spike):**
1. **Serwist × Turbopack** — `@serwist/next` injeta config webpack e quebra o build do Next 16; o caminho é `@serwist/turbopack` ou `next build --webpack`; SW em `dev` é duvidoso. **Spike antes de se comprometer (Fase 1).**
2. **TypeScript 7 (nativo)** — sem confirmação com Next/typescript-eslint/Vitest → começar em **5.x/6.x estável**.
3. **ESLint 10 × eslint-config-next 16** — usar **ESLint 9 (tag maintenance)** por segurança.
4. **shadcn × Tailwind v4** — usar só o fluxo novo (OKLCH, `tw-animate-css`, sem `forwardRef`); nada de tutoriais v3.
5. **Zod 4 / Zustand 5** têm mudanças que quebram tutoriais antigos.
6. **Windows:** OneDrive/antivírus degradam Turbopack e pnpm → repo em `C:\dev\athenas` (já decidido).

---

## 4. Conformidade (confiança média — validar com advogado de direito digital)

Pontos que mudam o produto:

- **ECA Digital (Lei 15.211/2025)** — aplica-se a serviços de **"provável acesso por menores"**. Um app de estudos (ENEM, ensino médio) provavelmente cai nisso. **Autodeclarar-se "18+" pode não bastar:** a lei prevê **verificação de idade mais robusta** que autodeclaração e regras de supervisão parental para menores de 16. O agente indica vigência desde **março/2026 (*)** e multas altas (*). **Isso precisa ser verificado na lei antes da Fase 3.** Opções: 18+ com verificação razoável, ou 16+ com privacidade máxima por padrão e sem grupos públicos para menores.
- **Marco Civil, art. 19 (STF 2025)** — tendência a regime de **notificação e retirada** para conteúdo ilícito; exige canal de denúncia acessível, remoção rápida e registro. Reforça a fila de moderação como requisito.
- **LGPD:** bases por tipo de dado (consentimento granular para ranking e agenda); direitos do titular (exportar/excluir); **transferência internacional** (Supabase/Vercel/Google): escolher região São Paulo e assinar DPAs; encarregado; ROPA; RIPD para dados de menores e ranking; plano de incidentes.
- **Google:** escopos de Calendar são **sensíveis** → verificação do app (domínio próprio, política de privacidade, justificativa, vídeo) a partir de ~100 usuários.
- **Antes de cobrar (pacotes):** CNPJ/NFS-e, CDC art. 49 (arrependimento 7 dias), cancelamento pelo mesmo canal, gateway certificado, planos para menores só com responsável.
- **Checklist antes de abrir grupos públicos:** Termos, Privacidade, Regras da Comunidade, cookies (guia ANPD), denúncia/moderação/logs, exportação/exclusão de conta, DPAs, idade mínima decidida, RIPD.

---

## 5. UX de redes sociais de estudo (confiança média, padrões gerais)

Padrões a adotar (convergem com a ADR-006): **privado por padrão com consentimento em camadas**; **ranking opt-in, semanal, grupos pequenos, por constância, sem rebaixamento**; **meta cooperativa de grupo** (estilo "party" do Habitica); **convite por link revogável com validade e limite de usos** + "pedir para entrar"; descoberta com cartão curto e **sinais de saúde** (ativo na semana, moderado, regras); **onboarding solo primeiro, social depois**; estados vazios com **uma** ação; perfil público mínimo e controlável. **Anti-padrões:** mostrar quem *não* estudou, streak coletivo que quebra por um, ranking eterno/global, notificações de culpa, perfil público por padrão, DMs de desconhecidos.

**Nova ideia incorporada:** *meta coletiva do grupo* (desafio da semana) entra como candidata da Fase 3, junto do ranking opcional.

---

## Impacto no plano

1. **Fase 0** — adicionar: SMTP próprio (Resend) já no beta; `proxy.ts`; backup via `supabase db dump`; Docker adiado (testes de banco rodam no CI e num projeto Supabase de dev na nuvem).
2. **Fase 1** — spike do Serwist × Turbopack antes de prometer offline.
3. **Antes da Fase 3** — decidir idade mínima/verificação com validação jurídica; desenhar telas sociais (R1/R3/R4 decididos).
4. **Pacotes (planos pagos)** — nada a cobrar no lançamento, mas o modelo já nasce com **limites por plano parametrizáveis** (tabela `plans`/`entitlements`, hoje todos no plano "completo"), para não precisar refatorar depois.
