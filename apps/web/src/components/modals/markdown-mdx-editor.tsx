"use client";

import { useMemo } from "react";
import {
  MDXEditor,
  codeBlockPlugin,
  codeMirrorPlugin,
  headingsPlugin,
  linkDialogPlugin,
  linkPlugin,
  listsPlugin,
  markdownShortcutPlugin,
  quotePlugin,
  thematicBreakPlugin
} from "@mdxeditor/editor";
import "@mdxeditor/editor/style.css";

import { cn } from "@/lib/utils";
import styles from "./markdown-mdx-editor.module.scss";

export type MarkdownMdxEditorProps = {
  markdown: string;
  onChange: (value: string) => void;
  editorKey: string;
  placeholder?: string;
  /** Larger surface for long documents; `false` matches the issue attachment editor. */
  compact?: boolean;
};

export function MarkdownMdxEditor({
  markdown,
  onChange,
  editorKey,
  placeholder = "Write markdown…",
  compact = true
}: MarkdownMdxEditorProps) {
  const plugins = useMemo(
    () => [
      headingsPlugin(),
      listsPlugin(),
      quotePlugin(),
      linkPlugin(),
      linkDialogPlugin(),
      thematicBreakPlugin(),
      codeBlockPlugin({ defaultCodeBlockLanguage: "txt" }),
      codeMirrorPlugin({
        codeBlockLanguages: {
          txt: "Plain text",
          js: "JavaScript",
          ts: "TypeScript",
          tsx: "TypeScript",
          json: "JSON",
          md: "Markdown"
        }
      }),
      markdownShortcutPlugin()
    ],
    []
  );

  return (
    <MDXEditor
      key={editorKey}
      markdown={markdown}
      onChange={(next, _initialNormalize) => onChange(next)}
      plugins={plugins}
      className={cn("dark-theme", styles.mdxEditorRoot, compact && styles.mdxEditorRootCompact)}
      contentEditableClassName={cn(styles.mdxEditorContent, compact && styles.mdxEditorContentCompact)}
      placeholder={placeholder}
      overlayContainer={typeof document !== "undefined" ? document.body : undefined}
    />
  );
}
