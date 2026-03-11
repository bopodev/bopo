"use client";

import { OfficeSpaceWorkspace } from "@/components/office-space-workspace";
import type { WorkspacePageProps } from "@/components/workspace/workspace-page-props";

export function OfficeSpacePageClient(props: WorkspacePageProps) {
  return <OfficeSpaceWorkspace {...props} />;
}
