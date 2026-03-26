import { notFound } from "next/navigation";
import { Suspense } from "react";
import { AgentMarkdownDocsPageClient } from "@/components/agent-markdown-docs-page-client";
import { loadWorkspaceData } from "@/lib/workspace-data";

export default async function AgentMarkdownDocsPage({
  params,
  searchParams
}: {
  params: Promise<{ agentId: string }>;
  searchParams: Promise<{ companyId?: string }>;
}) {
  const { agentId } = await params;
  const { companyId: companyIdParam } = await searchParams;
  const workspaceData = await loadWorkspaceData(companyIdParam, {
    include: {
      issues: false,
      agents: true,
      heartbeatRuns: false,
      auditEvents: false,
      costEntries: false,
      projects: false,
      goals: false,
      approvals: false,
      governanceInbox: false,
      attentionItems: false
    }
  });
  const agent = workspaceData.agents.find((entry) => entry.id === agentId);

  if (!workspaceData.companyId || !agent) {
    notFound();
  }

  return (
    <Suspense fallback={null}>
      <AgentMarkdownDocsPageClient
        companyId={workspaceData.companyId}
        companies={workspaceData.companies}
        agent={{ id: agent.id, name: agent.name, role: agent.role }}
      />
    </Suspense>
  );
}
