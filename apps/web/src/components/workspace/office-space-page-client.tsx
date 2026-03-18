"use client";

import { OfficeSpaceWorkspace } from "@/components/office-space-workspace";
import type { WorkspacePageProps } from "@/components/workspace/workspace-page-props";

export function OfficeSpacePageClient(props: Pick<WorkspacePageProps, "companyId" | "companies">) {
  return <OfficeSpaceWorkspace {...props} />;
}
