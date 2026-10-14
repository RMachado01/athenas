"use client";

import { TaskItem, TaskList } from "@tiptap/extension-list";
import { Placeholder } from "@tiptap/extensions";
import { EditorContent, useEditor, type Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { Bold, CheckSquare, Heading2, Italic, Link2, List, Quote } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, type ComponentType } from "react";
import type { NoDoDocumento } from "../documento";
import { CartoesNaNota, idsDeCartaoNoDocumento } from "./cartoes-na-nota";
import { ComandosDeBloco, criarWikilink, type FonteDeNotas } from "./extensoes";

/**
 * Editor em blocos (Tiptap), estilo Notion: digite "/" para inserir blocos e "[[" para ligar
 * a outra nota. Tocar num link abre a nota citada. Barra compacta com o essencial para o celular.
 */
export function EditorDeNota({
  conteudoInicial,
  caminhoBase = "/notas",
  fonte,
  aoMudar,
}: {
  conteudoInicial: NoDoDocumento;
  caminhoBase?: string;
  fonte: FonteDeNotas;
  aoMudar: (editor: Editor) => void;
}) {
  const router = useRouter();
  const aoMudarRef = useRef(aoMudar);
  useEffect(() => {
    aoMudarRef.current = aoMudar;
  }, [aoMudar]);

  // As extensões são criadas uma vez (a fonte lê dados frescos por funções).
  const extensoes = useMemo(
    () => [
      StarterKit.configure({ heading: { levels: [1, 2, 3] }, link: false }),
      Placeholder.configure({
        placeholder: ({ node }) =>
          node.type.name === "heading"
            ? "Título"
            : "Escreva, digite / para blocos, [[ para ligar notas ou :: para criar um flashcard",
      }),
      TaskList,
      TaskItem.configure({ nested: true }),
      criarWikilink(fonte),
      ComandosDeBloco,
      // Os ids de cartão do documento ao abrir são "desta nota" (colar de outra nota troca o id).
      CartoesNaNota.configure({ idsConhecidos: idsDeCartaoNoDocumento(conteudoInicial) }),
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps -- extensões fixas por editor
    [],
  );

  const editor = useEditor({
    extensions: extensoes,
    content: conteudoInicial,
    immediatelyRender: false, // Next: evita divergência entre servidor e navegador
    editorProps: {
      attributes: {
        class: "nota-prosa min-h-[40dvh] outline-none",
        "aria-label": "Conteúdo da nota",
        role: "textbox",
        "aria-multiline": "true",
      },
      // Clique num [[link]] abre a nota citada. No evento do DOM (antes da navegação padrão do <a>).
      handleDOMEvents: {
        click: (_view, event) => {
          const alvo = (event.target as HTMLElement).closest("a[data-wikilink]");
          const id = alvo?.getAttribute("data-id");
          if (!id) return false;
          event.preventDefault();
          router.push(`${caminhoBase}/${id}`);
          return true;
        },
      },
    },
    onUpdate: ({ editor }) => aoMudarRef.current(editor),
  });

  return (
    <div className="flex flex-col gap-3">
      {editor && <BarraDoEditor editor={editor} />}
      <EditorContent editor={editor} />
    </div>
  );
}

function BarraDoEditor({ editor }: { editor: Editor }) {
  const botoes: {
    rotulo: string;
    Icone: ComponentType<{ className?: string; "aria-hidden"?: boolean }>;
    ativo: boolean;
    acao: () => void;
  }[] = [
    {
      rotulo: "Negrito",
      Icone: Bold,
      ativo: editor.isActive("bold"),
      acao: () => editor.chain().focus().toggleBold().run(),
    },
    {
      rotulo: "Itálico",
      Icone: Italic,
      ativo: editor.isActive("italic"),
      acao: () => editor.chain().focus().toggleItalic().run(),
    },
    {
      rotulo: "Título",
      Icone: Heading2,
      ativo: editor.isActive("heading", { level: 2 }),
      acao: () => editor.chain().focus().toggleHeading({ level: 2 }).run(),
    },
    {
      rotulo: "Lista",
      Icone: List,
      ativo: editor.isActive("bulletList"),
      acao: () => editor.chain().focus().toggleBulletList().run(),
    },
    {
      rotulo: "Checklist",
      Icone: CheckSquare,
      ativo: editor.isActive("taskList"),
      acao: () => editor.chain().focus().toggleTaskList().run(),
    },
    {
      rotulo: "Citação",
      Icone: Quote,
      ativo: editor.isActive("blockquote"),
      acao: () => editor.chain().focus().toggleBlockquote().run(),
    },
    {
      rotulo: "Ligar a outra nota",
      Icone: Link2,
      ativo: false,
      acao: () => editor.chain().focus().insertContent("[[").run(),
    },
  ];

  return (
    <div
      role="toolbar"
      aria-label="Formatação"
      className="vidro rounded-pill sticky top-2 z-10 flex gap-0.5 self-start overflow-x-auto p-1"
    >
      {botoes.map(({ rotulo, Icone, ativo, acao }) => (
        <button
          key={rotulo}
          type="button"
          onMouseDown={(e) => e.preventDefault()} // mantém a seleção no editor
          onClick={acao}
          aria-label={rotulo}
          aria-pressed={ativo}
          title={rotulo}
          className={`grid size-10 shrink-0 cursor-pointer place-items-center rounded-full ${
            ativo ? "bg-accent text-on-accent" : "text-ink hover:bg-[var(--card)]"
          }`}
        >
          <Icone className="size-[18px]" aria-hidden />
        </button>
      ))}
    </div>
  );
}
