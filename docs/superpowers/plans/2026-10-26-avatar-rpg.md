# Plano — Avatar RPG na Sala

Spec: `docs/superpowers/specs/2026-10-26-avatar-rpg-design.md`. Um commit por passo.

1. **Modelo** (`features/pixel/avatar/modelo.ts`): tipo `AvatarSalvo`, `AVATAR_PADRAO`,
   `lerAvatar(json)`, `paraEscolhas(avatar)`; conquistas (`CONQUISTAS`, `avaliarConquistas`,
   `itemLiberado`), conjuntos oficiais (`CONJUNTOS`, `aplicarConjunto`). Testes de unidade.
2. **Dados**: `usePerfilPixel` passa a trazer `avatar`; `useSalvarAvatar` (upsert otimista só
   com `avatar`); `useEstatisticasDoAvatar` (foco, melhor sequência, tarefas concluídas,
   flashcards revisados) e `useConquistasDoAvatar` (libera, grava e avisa).
3. **Sala**: cadeira no desenho; `AvatarNaSala` (aceno → lendo/escrevendo; toque abre editor).
4. **Editor**: `EditorDeAvatar` na folha inferior (prévia, abas, conjuntos, trancados).
5. Supabase falso, e2e e a11y; rodar tudo; PR para a main.
