"use client";

import dynamic from "next/dynamic";

export const LazyMarkdownMdxEditor = dynamic(
  () => import("./markdown-mdx-editor").then((mod) => mod.MarkdownMdxEditor),
  {
    ssr: false,
    loading: () => <div className="text-sm text-muted-foreground py-4">Loading editor…</div>
  }
);

export type { MarkdownMdxEditorProps } from "./markdown-mdx-editor";
