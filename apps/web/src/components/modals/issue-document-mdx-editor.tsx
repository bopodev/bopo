"use client";

import type { MarkdownMdxEditorProps } from "./markdown-mdx-editor";
import { MarkdownMdxEditor } from "./markdown-mdx-editor";

/**
 * Full-height markdown surface for issue attachments (rich formatting as you type; markdown shortcuts).
 */
export function IssueDocumentMdxEditor(
  props: Pick<MarkdownMdxEditorProps, "markdown" | "onChange" | "editorKey"> & { placeholder?: string }
) {
  return (
    <MarkdownMdxEditor
      {...props}
      placeholder={props.placeholder ?? "Write content here..."}
      compact={false}
    />
  );
}
