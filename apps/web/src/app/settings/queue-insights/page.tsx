import { QueueInsightsPageClient } from "@/components/workspace/queue-insights-page-client";
import { loadWorkspaceData } from "@/lib/workspace-data";

export default async function SettingsQueueInsightsPage({
  searchParams
}: {
  searchParams: Promise<{ companyId?: string }>;
}) {
  const { companyId } = await searchParams;
  const workspaceData = await loadWorkspaceData(companyId, {
    include: {
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
    <QueueInsightsPageClient
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
      templates={workspaceData.templates}
    />
  );
}
