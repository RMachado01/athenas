"use client";

// Imports só de TIPO: trazem para o TypeScript os comandos das extensões (toggleBulletList etc.).
import type {} from "@tiptap/extension-list";
import Mention from "@tiptap/extension-mention";
import type {} from "@tiptap/starter-kit";
// @tiptap/react reexporta o núcleo (@tiptap/core): usamos daqui (só dependências diretas no pnpm).
import { Extension, ReactRenderer, type Editor, type Range } from "@tiptap/react";
import Suggestion, { type SuggestionOptions, type SuggestionProps } from "@tiptap/suggestion";
import {
  CheckSquare,
  Code,
  FilePlus2,
  FileText,
  Heading1,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  Minus,
  Quote,
} from "lucide-react";
import { buscarNotas, TIPO_DO_LINK } from "../documento";
import { MenuDeSugestao, type MenuDeSugestaoRef, type OpcaoDoMenu } from "./menu-de-sugestao";

/**
 * Extensões do editor (Tiptap):
 *  - Wikilink: digitar "[[" sugere notas existentes (ou cria uma nova) e insere um link que
 *    guarda o ID da nota (renomear a nota não quebra o link).
 *  - Comandos "/": menu de blocos estilo Notion (títulos, listas, checklist, citação, código...).
 */

// ---------------------------------------------------------------------------
// Popup das sugestões: um ReactRenderer posicionado embaixo do cursor.
// ---------------------------------------------------------------------------
function renderizarPopup<T extends OpcaoDoMenu>(rotulo: string) {
  let componente: ReactRenderer<MenuDeSugestaoRef> | null = null;
  let caixa: HTMLDivElement | null = null;

  const posicionar = (props: SuggestionProps<T>) => {
    const r = props.clientRect?.();
    if (!r || !caixa) return;
    const largura = Math.min(288, window.innerWidth - 32);
    caixa.style.left = `${Math.max(16, Math.min(r.left, window.innerWidth - largura - 16))}px`;
    caixa.style.top = `${r.bottom + 8}px`;
  };

  return {
    onStart: (props: SuggestionProps<T>) => {
      caixa = document.createElement("div");
      caixa.style.position = "fixed";
      caixa.style.zIndex = "60";
      document.body.appendChild(caixa);
      componente = new ReactRenderer(MenuDeSugestao, {
        props: { opcoes: props.items, rotulo, aoEscolher: (o: T) => props.command(o) },
        editor: props.editor,
      });
      caixa.appendChild(componente.element);
      posicionar(props);
    },
    onUpdate: (props: SuggestionProps<T>) => {
      componente?.updateProps({ opcoes: props.items, aoEscolher: (o: T) => props.command(o) });
      posicionar(props);
    },
    onKeyDown: ({ event }: { event: KeyboardEvent }) => {
      if (event.key === "Escape") return false;
      return componente?.ref?.aoTeclar(event) ?? false;
    },
    onExit: () => {
      componente?.destroy();
      caixa?.remove();
      componente = null;
      caixa = null;
    },
  };
}

// ---------------------------------------------------------------------------
// Wikilink ([[ ]])
// ---------------------------------------------------------------------------
export interface FonteDeNotas {
  /** Lista atual de notas (lida na hora, sempre fresca). */
  notas: () => { id: string; titulo: string; texto: string }[];
  /** Id da nota aberta (não sugere a nota para ela mesma). */
  notaAtual: () => string;
  /** Cria uma nota com esse título e devolve o id (ou null se não deu). */
  criar: (titulo: string) => Promise<string | null>;
}

interface OpcaoDeLink extends OpcaoDoMenu {
  notaId: string | null; // null = "criar nota"
  titulo: string;
}

export function criarWikilink(fonte: FonteDeNotas) {
  return Mention.extend({ name: TIPO_DO_LINK }).configure({
    HTMLAttributes: {
      class: "wikilink",
      "data-wikilink": "",
    },
    renderText: ({ node }) => `[[${node.attrs.label ?? ""}]]`,
    renderHTML: ({ node, options }) => [
      "a",
      {
        ...options.HTMLAttributes,
        href: `/notas/${node.attrs.id}`,
        "data-id": node.attrs.id,
      },
      node.attrs.label ?? "",
    ],
    suggestion: {
      char: "[[",
      allowSpaces: true,
      items: ({ query }): OpcaoDeLink[] => {
        const atual = fonte.notaAtual();
        const notas = fonte.notas().filter((n) => n.id !== atual);
        const achadas = buscarNotas(notas, query)
          .slice(0, 6)
          .map((n): OpcaoDeLink => ({
            id: n.id,
            notaId: n.id,
            titulo: n.titulo,
            rotulo: n.titulo,
            icone: <FileText className="size-4" aria-hidden />,
          }));
        const termo = query.replace(/\]+$/, "").trim();
        const jaExiste = notas.some((n) => n.titulo.trim().toLowerCase() === termo.toLowerCase());
        if (termo && !jaExiste) {
          achadas.push({
            id: "__criar__",
            notaId: null,
            titulo: termo.slice(0, 200),
            rotulo: `Criar “${termo.slice(0, 60)}”`,
            dica: "Nova nota com esse título",
            icone: <FilePlus2 className="size-4" aria-hidden />,
          });
        }
        return achadas;
      },
      command: ({ editor, range, props }: { editor: Editor; range: Range; props: OpcaoDeLink }) => {
        const inserir = (id: string, titulo: string) =>
          editor
            .chain()
            .focus()
            .insertContentAt(range, [
              { type: TIPO_DO_LINK, attrs: { id, label: titulo } },
              { type: "text", text: " " },
            ])
            .run();
        if (props.notaId) {
          inserir(props.notaId, props.titulo);
          return;
        }
        void fonte.criar(props.titulo).then((id) => {
          if (id) inserir(id, props.titulo);
        });
      },
      render: () => renderizarPopup<OpcaoDeLink>("Ligar a uma nota"),
    } as Partial<SuggestionOptions<OpcaoDeLink>>,
  });
}

// ---------------------------------------------------------------------------
// Comandos "/" (blocos)
// ---------------------------------------------------------------------------
interface OpcaoDeComando extends OpcaoDoMenu {
  executar: (editor: Editor, range: Range) => void;
}

const COMANDOS: OpcaoDeComando[] = [
  {
    id: "h1",
    rotulo: "Título 1",
    dica: "Seção grande",
    icone: <Heading1 className="size-4" aria-hidden />,
    executar: (e, r) => e.chain().focus().deleteRange(r).setNode("heading", { level: 1 }).run(),
  },
  {
    id: "h2",
    rotulo: "Título 2",
    dica: "Seção média",
    icone: <Heading2 className="size-4" aria-hidden />,
    executar: (e, r) => e.chain().focus().deleteRange(r).setNode("heading", { level: 2 }).run(),
  },
  {
    id: "h3",
    rotulo: "Título 3",
    dica: "Seção pequena",
    icone: <Heading3 className="size-4" aria-hidden />,
    executar: (e, r) => e.chain().focus().deleteRange(r).setNode("heading", { level: 3 }).run(),
  },
  {
    id: "lista",
    rotulo: "Lista",
    dica: "Com marcadores",
    icone: <List className="size-4" aria-hidden />,
    executar: (e, r) => e.chain().focus().deleteRange(r).toggleBulletList().run(),
  },
  {
    id: "numerada",
    rotulo: "Lista numerada",
    icone: <ListOrdered className="size-4" aria-hidden />,
    executar: (e, r) => e.chain().focus().deleteRange(r).toggleOrderedList().run(),
  },
  {
    id: "checklist",
    rotulo: "Checklist",
    dica: "Itens para marcar",
    icone: <CheckSquare className="size-4" aria-hidden />,
    executar: (e, r) => e.chain().focus().deleteRange(r).toggleTaskList().run(),
  },
  {
    id: "citacao",
    rotulo: "Citação",
    icone: <Quote className="size-4" aria-hidden />,
    executar: (e, r) => e.chain().focus().deleteRange(r).toggleBlockquote().run(),
  },
  {
    id: "codigo",
    rotulo: "Código",
    dica: "Bloco de código",
    icone: <Code className="size-4" aria-hidden />,
    executar: (e, r) => e.chain().focus().deleteRange(r).toggleCodeBlock().run(),
  },
  {
    id: "divisoria",
    rotulo: "Divisória",
    icone: <Minus className="size-4" aria-hidden />,
    executar: (e, r) => e.chain().focus().deleteRange(r).setHorizontalRule().run(),
  },
];

export const ComandosDeBloco = Extension.create({
  name: "comandosDeBloco",
  addProseMirrorPlugins() {
    return [
      Suggestion<OpcaoDeComando>({
        editor: this.editor,
        char: "/",
        items: ({ query }) => {
          const t = query.toLocaleLowerCase("pt-BR");
          return COMANDOS.filter((c) => c.rotulo.toLocaleLowerCase("pt-BR").includes(t));
        },
        command: ({ editor, range, props }) => props.executar(editor, range),
        render: () => renderizarPopup<OpcaoDeComando>("Inserir bloco"),
      }),
    ];
  },
});
