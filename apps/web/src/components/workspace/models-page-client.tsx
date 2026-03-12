"use client";

import { WorkspaceClient } from "@/components/workspace-client";
import type { WorkspacePageProps } from "@/components/workspace/workspace-page-props";

export function ModelsPageClient(props: WorkspacePageProps) {
  // The WorkspaceClient is responsible for fetching and rendering models
  // in the "Models" section using the active company context.
  return <WorkspaceClient activeNav="Models" {...props} />;
}
