import { DashboardPageClient } from "@/components/workspace/dashboard-page-client";
import { loadWorkspaceData } from "@/lib/workspace-data";

export default async function DashboardPage({
  searchParams
}: {
  searchParams: Promise<{ companyId?: string }>;
}) {
  const { companyId } = await searchParams;
  const workspaceData = await loadWorkspaceData(companyId);

  return (
    <DashboardPageClient
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
