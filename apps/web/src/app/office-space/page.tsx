import { OfficeSpacePageClient } from "@/components/workspace/office-space-page-client";
import { loadWorkspaceData } from "@/lib/workspace-data";

export default async function OfficeSpacePage({
  searchParams
}: {
  searchParams: Promise<{ companyId?: string }>;
}) {
  const { companyId } = await searchParams;
  const workspaceData = await loadWorkspaceData(companyId, {
    include: {
      issues: false,
      agents: false,
      heartbeatRuns: false,
      goals: false,
      approvals: false,
      governanceInbox: false,
      attentionItems: false,
      auditEvents: false,
      costEntries: false,
      projects: false,
      templates: false
    }
  });

  return (
    <OfficeSpacePageClient
      companyId={workspaceData.companyId}
      companies={workspaceData.companies}
    />
  );
}
