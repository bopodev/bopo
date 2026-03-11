"use client";

import { WorkspaceClient } from "@/components/workspace-client";
import type { WorkspacePageProps } from "@/components/workspace/workspace-page-props";

export function TraceLogsPageClient(props: WorkspacePageProps) {
  return <WorkspaceClient activeNav="Logs" {...props} />;
}
