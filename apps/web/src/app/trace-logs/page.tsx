import { TraceLogsPageClient } from "@/components/workspace/trace-logs-page-client";
import { loadWorkspaceData } from "@/lib/workspace-data";

export default async function TraceLogsPage({
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
      governanceInbox: false,
      costEntries: false,
      projects: false,
      templates: false
    }
  });

  return (
    <TraceLogsPageClient
      companyId={workspaceData.companyId}
      activeCompany={workspaceData.activeCompany}
      companies={workspaceData.companies}
      issues={workspaceData.issues}
      agents={workspaceData.agents}
      heartbeatRuns={workspaceData.heartbeatRuns}
      goals={workspaceData.goals}
      approvals={workspaceData.approvals}
      auditEvents={workspaceData.auditEvents}
      costEntries={workspaceData.costEntries}
      projects={workspaceData.projects}
    />
  );
}
