"use client";

import { WorkspaceClient } from "@/components/workspace-client";
import type { WorkspacePageProps } from "@/components/workspace/workspace-page-props";

export function SettingsPageClient(props: WorkspacePageProps) {
  return <WorkspaceClient activeNav="Settings" {...props} />;
}
