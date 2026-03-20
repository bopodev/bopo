import { loadWorkspaceData } from "@/lib/workspace-data";
import { ModelsPageClient } from "@/components/workspace/models-page-client";

export default async function SettingsModelsPage({
  searchParams
}: {
  searchParams: Promise<{ companyId?: string }>;
}) {
  const { companyId } = await searchParams;
  const workspaceData = await loadWorkspaceData(companyId, {
    include: {
      issues: false,
      heartbeatRuns: false,
      goals: false,
      approvals: false,
      governanceInbox: false,
      auditEvents: false,
      costEntries: false,
      projects: false
    }
  });

  return (
    <ModelsPageClient
      companyId={workspaceData.companyId}
      activeCompany={workspaceData.activeCompany}
      companies={workspaceData.companies}
      issues={workspaceData.issues}
      agents={workspaceData.agents}
      heartbeatRuns={workspaceData.heartbeatRuns}
      goals={workspaceData.goals}
      approvals={workspaceData.approvals}
      governanceInbox={workspaceData.governanceInbox}
      attentionItems={workspaceData.attentionItems}
      auditEvents={workspaceData.auditEvents}
      costEntries={workspaceData.costEntries}
      projects={workspaceData.projects}
    />
  );
}
