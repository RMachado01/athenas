# Pesquisa de produto — Athenas para qualquer estudante

**Data:** 2026-10-12 · **Origem:** agente pesquisador (web) · **Status:** aprovada pelo Renan como base do roadmap.
Itens marcados "(não verificado)" não foram confirmados na fonte primária.

## 1. Metodologias de estudo com evidência

Base: Dunlosky et al. (2013), revisão de 10 técnicas ([APS](https://www.psychologicalscience.org/news/releases/which-study-strategies-make-the-grade.html)). Utilidade **alta**: testar a si mesmo e estudo espaçado. **Moderada**: interrogação elaborativa, autoexplicação, intercalação. **Baixa**: resumir, grifar, reler.

| Técnica | Evidência | Recurso no Athenas |
|---|---|---|
| Active recall | Alta. Roediger & Karpicke 2006 ([PDF](https://psychology.ecu.edu/wp-content/pv-uploads/sites/216/2019/03/Roediger-Karpicke-2006.pdf)); Karpicke & Blunt 2011: ~50% mais retenção que mapas conceituais ([Purdue](https://www.purdue.edu/newsroom/research/2011/110120KarpickeScience.html)) | Flashcards; botão "Me teste" na nota com as linhas `pergunta :: resposta` |
| Repetição espaçada | Alta | Flashcards FSRS; revisões devidas por trilha; card no Início |
| Blurting | Recuperação livre (herda a evidência; a técnica com esse nome não foi estudada à parte) | Modo blurting na nota: esconde o texto, a pessoa reescreve, o app mostra a diferença e oferece virar as lacunas em cartões |
| Intercalação | Moderada. Brunmair & Richter 2019, g = 0,42 ([PDF](https://www.psychologie.uni-wuerzburg.de/fileadmin/06020400/2019/Brunmair_Richter_in_press__2019_META-ANALYSIS_OF_INTERLEAVED_LEARNING.pdf)) | Revisão "misturar baralhos da trilha"; Foco alternando assuntos |
| Interrogação elaborativa | Moderada | Prompt "Por quê?" ao criar cartão |
| Autoexplicação / Feynman | Moderada (autoexplicação) | Modelo de nota "Explique para um leigo"; "ensine um colega" nas salas |
| Pomodoro | Mista; estudo de 2025 sem diferença de cansaço vs Flowtime ([PMC](https://pmc.ncbi.nlm.nih.gov/articles/PMC12292963/)) | Já existe. Adicionar modo Flowtime e a pergunta pós-sessão "O que você lembra?" |
| Cornell | Baixa/indireta | Modelo de nota Cornell; pistas viram cartões |
| Mapas mentais | Baixa a moderada | Mural "mapa de memória": desenhar sem consultar e comparar |
| Resumir, grifar, reler | Baixa | Não incentivar |

## 2. Flashcards e SRS

- **FSRS é o padrão atual.** [ts-fsrs](https://github.com/open-spaced-repetition/ts-fsrs) (MIT, FSRS-6): `createEmptyCard()`, `fsrs()`, `repeat()` (prévia das 4 notas), `next(card, data, Rating)`. Anki usa FSRS desde a 23.10, FSRS-6 na 25.07 ([notas](https://newreleases.io/project/github/ankitects/anki/release/25.07)). Retenção desejada recomendada: **90%** ([manual do Anki](https://docs.ankiweb.net/deck-options.html)).
- **Apps:** Anki (algoritmo ótimo, UX hostil); RemNote (cartões dentro da nota, complexo); Mochi (markdown limpo); Quizlet (onboarding fácil, SRS fraco); Brainscape (baralhos prontos por área); Obsidian SR ([repo](https://github.com/st3v3nmw/obsidian-spaced-repetition)): sintaxe `pergunta::resposta`, `:::` reversível, `?` multilinha, `==cloze==` — **adotar a mesma sintaxe** (importação do Obsidian de graça).
- **Carga:** 20 novos/dia ≈ 200 revisões/dia no Anki. Padrão do Athenas: **10 novos/dia**, previsão de carga ("amanhã: ~45"), **pausa automática de novos com atraso**, dias leves.
- **Sessão no celular:** toque grande para revelar; 4 botões com o intervalo (`<10min · 1d · 3d · 8d`) vindo de `repeat()`; deslizar opcional, nunca única forma; Desfazer visível; barra de progresso; resumo final; suspender/editar sem sair; modo Errei/Acertei para iniciantes.
- **Onboarding SRS:** 3 telas ("esquecer é normal", curva do esquecimento, "seja honesto"), baralho de exemplo da área, primeira sessão de 5 cartões, convite a criar cartão numa nota.
- **Regras de formulação:** [20 regras do SuperMemo](https://www.supermemo.com/en/blog/twenty-rules-of-formulating-knowledge). Ideia: "linter de cartão" (resposta > ~15 palavras, listas, ambiguidade).

## 3. Trilhas prontas: o que é legal usar

| Fonte | Status | Uso |
|---|---|---|
| roadmap.sh | **Não é open source**: uso pessoal, proíbe republicar; links permitidos ([licença](https://github.com/kamranahmedse/developer-roadmap/blob/master/license)) | Só linkar; escrever trilhas próprias |
| Editais, leis, atos oficiais | Lei 9.610/98 art. 8º, IV exclui atos oficiais da proteção ([texto](https://www.conjur.com.br/wp-content/uploads/2023/09/lei-9610.pdf)); edital como ato oficial é interpretação razoável | Importar o conteúdo programático como trilha |
| Matriz do ENEM (INEP) | Documento oficial ([PDF](https://download.inep.gov.br/download/enem/matriz_referencia.pdf), link não testado) | Trilha área > competência > habilidade |
| BNCC, grades públicas, edital OAB | Atos/documentos oficiais | Importar a estrutura |
| CEFR | © Conselho da Europa, reprodução exige permissão | Só os níveis A1–C2; descritores próprios; linkar |
| Syllabus de certificações | Protegidos | Nomes dos domínios + link oficial |

Escala: **trilhas comunitárias CC BY-SA** com "fork".

## 4. Inspirações

Forest/Flora (progresso visual; punição opcional; "planta da sala"), Study Bunny/Finch (personagem que reage), Things 3/Structured (microinterações, linha do tempo), Notion/Obsidian, Duolingo (congelamento do streak aumentou uso — [blog](https://blog.duolingo.com/duolingo-streak-research/); riscos de ansiedade — [Decision Lab](https://thedecisionlab.com/insights/consumer-insights/streak-creep-the-perils-of-too-much-gamification), [arXiv](https://www.arxiv.org/abs/2203.16175)), Focusmate (intenção declarada), StudyStream/Lofi Girl (salas silenciosas — [TechCrunch](https://techcrunch.com/2021/10/06/studystream-gives-students-a-place-to-study-live-with-thousands-of-others/)), Gather/Habbo (salas pixel). Telas: [Mobbin](https://mobbin.com), [Dribbble](https://dribbble.com/search/study-app).

**Gamificação saudável:** premiar consistência e revisão, não horas; sem ranking global de horas; sem loot boxes; streak semanal com congelamento; nada de notificação culpabilizante.

## 5. Social e lei

- Funciona: body doubling, salas silenciosas, sessão com intenção declarada, dupla de accountability, metas coletivas (evidência sobretudo de usuários — [CHADD](https://chadd.org/adhd-news/adhd-news-adults/could-a-body-double-help-you-increase-your-productivity/)).
- Riscos: comparação tóxica (estatísticas privadas por padrão), moderação (denúncia, bloqueio, silêncio padrão).
- **ECA Digital — Lei 15.211/2025**, em vigor desde mar/2026, Decreto 12.880/2026 ([Planalto](https://www.planalto.gov.br/ccivil_03/_ato2023-2026/2025/lei/L15211.htm), [UNICEF](https://www.unicef.org/brazil/estatuto-digital-da-crianca-e-do-adolescente-eca-digital)). Segundo fontes secundárias (conferir no texto oficial): art. 24 conta de até 16 anos vinculada a responsável; art. 9º §1º veda autodeclaração de idade para conteúdo impróprio; art. 35 multa até 10% do faturamento (teto R$ 50 mi); fiscalização ANPD mais rígida a partir de jan/2027 ([Machado Meyer](https://www.machadomeyer.com.br/images/ebooks/Factsheet_ECA_Digital.pdf)).
- **LGPD art. 14:** melhor interesse do menor ([Aurum](https://www.aurum.com.br/blog/lgpd-comentada/art-14-lgpd/)).
- Na prática: data de nascimento no cadastro; menores com perfil privado, sem DM com adultos desconhecidos, sem música/localização ligados por padrão; salas de menores separadas ou por convite; sem anúncio por perfilamento; **advogado antes de abrir para menores de 18**.

## 6. Top 10 sugerido

1. Flashcards ts-fsrs + sintaxe Obsidian + 4 botões com intervalo e desfazer.
2. Onboarding por perfil (concurso, ENEM, faculdade, programação, idiomas, medicina, OAB, certificação) com trilha modelo e baralho de exemplo.
3. Importar edital/matriz como trilha.
4. Modo blurting e "Me teste" nas notas.
5. Limites e previsão de carga (10 novos/dia, pausa com atraso, dias leves).
6. Linter de cartões (20 regras).
7. Streak semanal com congelamento; estatísticas privadas por padrão.
8. Salas silenciosas com intenção declarada (Supabase Realtime), antes dos avatares.
9. Base de conformidade ECA Digital/LGPD.
10. Trilhas comunitárias CC BY-SA + biblioteca pixel art com presença.
