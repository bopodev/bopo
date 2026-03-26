import { notFound } from "next/navigation";
import { LoopDetailPageClient } from "@/components/loop-detail-page-client";
import { loadWorkspaceData } from "@/lib/workspace-data";

export default async function LoopDetailPage({
  params,
  searchParams
}: {
  params: Promise<{ loopId: string }>;
  searchParams: Promise<{ companyId?: string }>;
}) {
  const { loopId } = await params;
  const { companyId } = await searchParams;
  const workspaceData = await loadWorkspaceData(companyId, {
    include: {
      issues: false,
      agents: true,
      heartbeatRuns: false,
      approvals: false,
      costEntries: false,
      projects: true,
      goals: false,
      governanceInbox: false,
      attentionItems: false,
      auditEvents: false
    }
  });

  if (!workspaceData.companyId) {
    notFound();
  }

  return (
    <LoopDetailPageClient
      loopId={loopId}
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
