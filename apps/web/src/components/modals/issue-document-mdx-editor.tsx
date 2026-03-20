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
import styles from "./issue-document-mdx-editor.module.scss";

/**
 * Single rich-text markdown surface (no toolbar): type markdown shortcuts like ### for headings,
 * lists, `code`, etc.—formatted inline like a doc editor.
 */
export function IssueDocumentMdxEditor({
  markdown,
  onChange,
  editorKey
}: {
  markdown: string;
  onChange: (value: string) => void;
  editorKey: string;
}) {
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
      className={cn("dark-theme", styles.mdxEditorRoot)}
      contentEditableClassName={styles.mdxEditorContent}
      placeholder="Write an update… Use markdown (e.g. ### Heading, - lists, `code`)."
      overlayContainer={typeof document !== "undefined" ? document.body : undefined}
    />
  );
}
