import { IssuesPageClient } from "@/components/workspace/issues-page-client";
import { loadWorkspaceData } from "@/lib/workspace-data";

export default async function IssuesPage({
  searchParams
}: {
  searchParams: Promise<{ companyId?: string }>;
}) {
  const { companyId } = await searchParams;
  const workspaceData = await loadWorkspaceData(companyId);

  return (
    <IssuesPageClient
      companyId={workspaceData.companyId}
      activeCompany={workspaceData.activeCompany}
      companies={workspaceData.companies}
      issues={workspaceData.issues}
      agents={workspaceData.agents}
      heartbeatRuns={workspaceData.heartbeatRuns}
      goals={workspaceData.goals}
      approvals={workspaceData.approvals}
      attentionItems={workspaceData.attentionItems}
      auditEvents={workspaceData.auditEvents}
      costEntries={workspaceData.costEntries}
      projects={workspaceData.projects}
    />
  );
}
