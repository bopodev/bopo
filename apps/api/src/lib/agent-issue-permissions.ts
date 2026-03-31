/** Agent row fields used for issue create / assignee orchestration (agent actors only). */
export type AgentIssueOrchestrationFlags = {
  canAssignAgents: boolean;
  canCreateIssues: boolean;
};

export function agentIssueCreateForbiddenMessage(agent: AgentIssueOrchestrationFlags): string | null {
  if (!agent.canCreateIssues) {
    return "This agent is not allowed to create issues.";
  }
  return null;
}

/**
 * POST /issues: assigning to another agent requires canAssignAgents; self or unassigned does not.
 */
export function agentIssueCreateAssigneeForbiddenMessage(
  agent: AgentIssueOrchestrationFlags,
  actorAgentId: string,
  assigneeAgentId: string | null | undefined
): string | null {
  if (assigneeAgentId == null || assigneeAgentId === "") {
    return null;
  }
  if (assigneeAgentId === actorAgentId) {
    return null;
  }
  if (!agent.canAssignAgents) {
    return "This agent is not allowed to assign issues to other agents.";
  }
  return null;
}

/**
 * PUT /issues when assignee changes: allow setting assignee to self without canAssignAgents;
 * unassign or assign to another agent requires canAssignAgents.
 */
export function agentIssuePutAssigneeChangeForbiddenMessage(
  agent: AgentIssueOrchestrationFlags,
  actorAgentId: string,
  previousAssigneeId: string | null,
  nextAssigneeId: string | null
): string | null {
  const prev = previousAssigneeId && previousAssigneeId.trim() ? previousAssigneeId.trim() : null;
  const next = nextAssigneeId && nextAssigneeId.trim() ? nextAssigneeId.trim() : null;
  if (prev === next) {
    return null;
  }
  if (next === actorAgentId) {
    return null;
  }
  if (!agent.canAssignAgents) {
    return "This agent is not allowed to reassign or unassign issues (except to assign to self).";
  }
  return null;
}
