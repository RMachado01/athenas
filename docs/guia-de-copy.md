# Guia de copy do Athenas

**Criado:** 2026-10-15 · Referências de tom: Notion (claro, calmo, sem culpa) e Obsidian (direto, sem enfeite, o usuário no controle).

Texto de interface é parte do design. Este guia junta as regras que o app já segue sem ter escrito e o que falta padronizar.

## Voz

- **Fala com você**, em português do Brasil, informal sem gíria: "Não deu pra salvar", não "Falha na operação".
- **Frases curtas.** Um verbo no começo do botão: "Criar meta", "Excluir tarefa".
- **Sem culpa.** Nada de "Você errou". Diga o que aconteceu e o que fazer.
- **Sem exclamação**, exceto em celebração de verdade (meta batida, revisão concluída).

## Padrões

### Botões
Verbo + objeto quando houver ambiguidade. Nunca "OK", "Sim" ou "Enviar".

### Erros
O que aconteceu + o que fazer. Exemplo bom já no app: "Não deu pra criar a meta. Tente de novo."

### Estados vazios
O que é + como começar. Um botão só.
Ex.: "Nenhum baralho ainda. Crie o primeiro para começar a revisar."

### Exclusão (padrão único para tarefa, mural, nota, baralho)

| Parte | Regra | Exemplo (mural) |
|---|---|---|
| Título | Verbo + objeto, em pergunta | "Excluir o mural “Teste”?" |
| Descrição | O que some junto + se dá para desfazer | "Os 12 itens e as ligações serão apagados. Isso não dá para desfazer." |
| Botão seguro | Nomeia o que se mantém. É o foco inicial | "Manter mural" |
| Botão perigoso | Repete o verbo do título | "Excluir mural" |

Hoje as tarefas usam "Cancelar" / "Excluir". Funciona, mas "Manter tarefa" / "Excluir tarefa" é mais claro e evita confundir o botão do diálogo com o botão que o abriu (ambos se chamam "Excluir"). **Mudança pendente**, porque exige atualizar `tests/e2e/tarefas.spec.ts` e `tests/a11y/tarefas.spec.ts`.

**Desfazer em vez de confirmar (ideia a avaliar).** Notion e Obsidian tratam exclusão como recuperável (lixeira). Para nota e mural, uma lixeira de 30 dias ou um aviso "Mural excluído · Desfazer" é mais gentil que um diálogo de confirmação, mas exige `deleted_at` no banco. Registrar como decisão antes de implementar.

## Vocabulário (um nome para cada coisa)

| Use | Evite |
|---|---|
| Excluir | Apagar, Remover, Deletar (para o usuário) |
| Trilha | Matéria, Curso |
| Baralho / Cartão | Deck / Card |
| Foco | Pomodoro (só nas configurações do ciclo) |
| Nota | Anotação |

## Achados da auditoria (fora de mural e notas)

| # | Onde | Achado | Sugestão |
|---|---|---|---|
| 1 | `features/tasks/components/painel-de-detalhes.tsx` | Botão "Começar foco" desabilitado com dica "O modo Foco chega em breve", mas o Foco já existe. A dica está desatualizada e o botão é um beco sem saída. | Ligar o botão ao Foco com a tarefa escolhida. É funcionalidade, não só texto. |
| 2 | `features/focus/queries.ts` | "Não consegui salvar…" no Foco e na Personalização, "Não deu pra…" em Metas e Flashcards. Duas vozes para o mesmo erro. | Escolher uma. Sugestão: "Não deu pra…", mais próxima da fala e já a mais usada. |
| 3 | Exclusão de tarefa | Dois botões "Excluir" na mesma tela. | Ver padrão acima. |
| 4 | Placeholder do adicionar rápido | "Ex.: 5 exercícios de CTE amanhã 19h #sql !alta" é ótimo: ensina a sintaxe com exemplo real. | Manter. Usar o mesmo recurso nas notas (`pergunta :: resposta`). |

O que já está bom e deve ser preservado: erros que dizem o que fazer, `aria-label` em tudo, foco inicial no botão seguro, mensagens de validação específicas ("Digite as horas, por exemplo 5 ou 1,5").
