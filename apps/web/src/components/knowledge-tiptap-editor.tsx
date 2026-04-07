"use client";

import type { Editor } from "@tiptap/core";
import Link from "@tiptap/extension-link";
import Placeholder from "@tiptap/extension-placeholder";
import { BubbleMenu } from "@tiptap/react/menus";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { Bold, Code, Italic, Link2, Strikethrough } from "lucide-react";
import MarkdownIt from "markdown-it";
import TurndownService from "turndown";
import { useEffect, useMemo, useRef, useState } from "react";

const markdownIt = new MarkdownIt({ html: false, linkify: true, breaks: true });

function KnowledgeTiptapBubbleToolbar({ editor }: { editor: Editor }) {
  const [, setUpdate] = useState(0);
  useEffect(() => {
    const bump = () => setUpdate((n) => n + 1);
    editor.on("selectionUpdate", bump);
    editor.on("transaction", bump);
    return () => {
      editor.off("selectionUpdate", bump);
      editor.off("transaction", bump);
    };
  }, [editor]);

  function toggleLink() {
    if (editor.isActive("link")) {
      editor.chain().focus().unsetLink().run();
      return;
    }
    const prev = editor.getAttributes("link").href as string | undefined;
    const href = window.prompt("Link URL", prev?.trim() ? prev : "https://");
    if (href == null || href.trim() === "") {
      return;
    }
    editor.chain().focus().extendMarkRange("link").setLink({ href: href.trim() }).run();
  }

  return (
    <BubbleMenu
      editor={editor}
      className="ui-knowledge-tiptap-bubble-menu"
      options={{
        placement: "top",
        offset: 8,
        flip: true,
        shift: true,
        inline: true
      }}
    >
      <button
        type="button"
        className={
          editor.isActive("bold")
            ? "ui-knowledge-tiptap-bubble-menu-btn ui-knowledge-tiptap-bubble-menu-btn--active"
            : "ui-knowledge-tiptap-bubble-menu-btn"
        }
        onClick={() => editor.chain().focus().toggleBold().run()}
        aria-label="Bold"
        aria-pressed={editor.isActive("bold")}
      >
        <Bold className="ui-icon-sm" aria-hidden />
      </button>
      <button
        type="button"
        className={
          editor.isActive("italic")
            ? "ui-knowledge-tiptap-bubble-menu-btn ui-knowledge-tiptap-bubble-menu-btn--active"
            : "ui-knowledge-tiptap-bubble-menu-btn"
        }
        onClick={() => editor.chain().focus().toggleItalic().run()}
        aria-label="Italic"
        aria-pressed={editor.isActive("italic")}
      >
        <Italic className="ui-icon-sm" aria-hidden />
      </button>
      <button
        type="button"
        className={
          editor.isActive("strike")
            ? "ui-knowledge-tiptap-bubble-menu-btn ui-knowledge-tiptap-bubble-menu-btn--active"
            : "ui-knowledge-tiptap-bubble-menu-btn"
        }
        onClick={() => editor.chain().focus().toggleStrike().run()}
        aria-label="Strikethrough"
        aria-pressed={editor.isActive("strike")}
      >
        <Strikethrough className="ui-icon-sm" aria-hidden />
      </button>
      <button
        type="button"
        className={
          editor.isActive("code")
            ? "ui-knowledge-tiptap-bubble-menu-btn ui-knowledge-tiptap-bubble-menu-btn--active"
            : "ui-knowledge-tiptap-bubble-menu-btn"
        }
        onClick={() => editor.chain().focus().toggleCode().run()}
        aria-label="Inline code"
        aria-pressed={editor.isActive("code")}
      >
        <Code className="ui-icon-sm" aria-hidden />
      </button>
      <button
        type="button"
        className={
          editor.isActive("link")
            ? "ui-knowledge-tiptap-bubble-menu-btn ui-knowledge-tiptap-bubble-menu-btn--active"
            : "ui-knowledge-tiptap-bubble-menu-btn"
        }
        onClick={() => toggleLink()}
        aria-label={editor.isActive("link") ? "Remove link" : "Add link"}
        aria-pressed={editor.isActive("link")}
      >
        <Link2 className="ui-icon-sm" aria-hidden />
      </button>
    </BubbleMenu>
  );
}

export function KnowledgeTiptapEditor({
  hydrateVersion,
  markdown,
  onMarkdownChange,
  placeholder = "Write markdown…",
  readOnly = false
}: {
  /** Increment when a file load completes so the editor hydrates from disk without clobbering typing. */
  hydrateVersion: number;
  markdown: string;
  onMarkdownChange: (value: string) => void;
  placeholder?: string;
  readOnly?: boolean;
}) {
  const turndown = useMemo(
    () =>
      new TurndownService({
        headingStyle: "atx",
        codeBlockStyle: "fenced",
        bulletListMarker: "-"
      }),
    []
  );

  const markdownRef = useRef(markdown);
  markdownRef.current = markdown;

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] }
      }),
      Link.configure({
        openOnClick: false,
        autolink: true,
        HTMLAttributes: { class: "ui-knowledge-tiptap-link" }
      }),
      Placeholder.configure({ placeholder })
    ],
    content: "<p></p>",
    editorProps: {
      attributes: {
        class: "ui-knowledge-tiptap-prosemirror",
        spellCheck: "true"
      }
    },
    onUpdate: ({ editor: ed }) => {
      const raw = turndown.turndown(ed.getHTML()).trim();
      onMarkdownChange(raw);
    }
  });

  useEffect(() => {
    if (!editor) {
      return;
    }
    const md = markdownRef.current ?? "";
    const html = md.trim() ? markdownIt.render(md) : "<p></p>";
    editor.commands.setContent(html, { emitUpdate: false });
  }, [editor, hydrateVersion]);

  useEffect(() => {
    if (!editor) {
      return;
    }
    editor.setEditable(!readOnly);
  }, [editor, readOnly]);

  return (
    <div className="ui-knowledge-tiptap-shell">
      {editor && !readOnly ? <KnowledgeTiptapBubbleToolbar editor={editor} /> : null}
      <EditorContent editor={editor} className="ui-knowledge-tiptap-editor-root" />
    </div>
  );
}
