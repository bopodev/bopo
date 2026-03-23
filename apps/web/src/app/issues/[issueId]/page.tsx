import { notFound } from "next/navigation";
import { IssueDetailPageClient } from "@/components/issue-detail-page-client";
import { loadWorkspaceData } from "@/lib/workspace-data";

export default async function IssuePage({
  params,
  searchParams
}: {
  params: Promise<{ issueId: string }>;
  searchParams: Promise<{ companyId?: string }>;
}) {
  const { issueId } = await params;
  const { companyId } = await searchParams;
  const workspaceData = await loadWorkspaceData(companyId, {
    include: {
      issues: true,
      agents: true,
      heartbeatRuns: false,
      approvals: false,
      costEntries: true,
      projects: true,
      goals: true,
      governanceInbox: false,
      attentionItems: false,
      auditEvents: false
    }
  });
  const issue = workspaceData.issues.find((entry) => entry.id === issueId);

  if (!workspaceData.companyId || !issue) {
    notFound();
  }

  const goalsForIssues = workspaceData.goals.map((g) => ({
    id: g.id,
    title: g.title,
    projectId: g.projectId
  }));

  return (
    <IssueDetailPageClient
      companyId={workspaceData.companyId}
      companies={workspaceData.companies}
      issue={issue}
      allIssues={workspaceData.issues}
      agents={workspaceData.agents}
      projects={workspaceData.projects}
      goals={goalsForIssues}
      costEntries={workspaceData.costEntries}
    />
  );
}
