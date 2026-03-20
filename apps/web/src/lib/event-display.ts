/**
 * Human-readable labels for audit / trace events and issue activity rows.
 */

const AUDIT_EVENT_LABELS: Record<string, string> = {
  "heartbeat.completed": "Heartbeat run finished",
  "heartbeat.failed": "Heartbeat run failed",
  "heartbeat.started": "Heartbeat run started",
  "heartbeat.cancel_requested": "Heartbeat cancel requested",
  "heartbeat.cancelled": "Heartbeat run cancelled",
  "heartbeat.workspace_resolution_warning": "Workspace path warning during heartbeat",
  "heartbeat.control_plane_env_invalid": "Invalid control plane environment for heartbeat",
  "heartbeat.control_plane_preflight_passed": "Control plane connectivity check passed",
  "heartbeat.control_plane_preflight_failed": "Control plane connectivity check failed",
  "heartbeat.runtime_launch": "Agent runtime launched",
  "heartbeat.memory_updated": "Agent memory updated",
  "heartbeat.memory_fact_promoted": "Memory fact promoted",
  "heartbeat.memory_alignment_scored": "Memory alignment scored",
  "heartbeat.review_gate_blocked": "Issue not sent to review (evidence gate)",
  "heartbeat.run_digest": "Heartbeat run summary saved",
  "heartbeat.run_comment_failed": "Failed to post heartbeat comment on issue",
  "heartbeat.provider_usage_limited": "Heartbeat limited by provider usage",
  "heartbeat.transcript_persist_failed": "Failed to save run transcript",
  "heartbeat.release_failed": "Agent release step failed",
  "heartbeat.stale_recovered": "Stale heartbeat run recovered",
  "heartbeat.sweep.completed": "Heartbeat sweep completed",
  "agent.paused_auto_provider_limit": "Agent paused (provider limit)",

  "budget.hard_stop": "Company budget hard stop",
  "budget.soft_warning": "Company budget warning",
  "budget.override_requested": "Budget override requested",
  "project_budget.hard_stop": "Project budget hard stop",
  "project_budget.override_requested": "Project budget override requested",
  "project_budget.override_applied": "Project budget override applied",

  "plugin.hook.failures": "Plugin hook failures",

  "governance.approval_resolved": "Governance approval resolved",
  "governance.hire_approval_comment_failed": "Failed to add hire approval comment",

  "agent.hired": "Agent hired",
  "agent.updated": "Agent updated",
  "agent.deleted": "Agent deleted",
  "agent.paused": "Agent paused",
  "agent.resumed": "Agent resumed",
  "agent.terminated": "Agent terminated",

  "issue.created": "Issue created",
  "issue.updated": "Issue updated",
  "issue.deleted": "Issue deleted",
  "issue.comment_added": "Issue comment added",
  "issue.comment_updated": "Issue comment updated",
  "issue.comment_deleted": "Issue comment deleted",
  "issue.attachments_added": "Issue attachments added",
  "issue.attachment_deleted": "Issue attachment removed",

  "project.created": "Project created",
  "project.updated": "Project updated",
  "project.deleted": "Project deleted",
  "project.workspace_created": "Project workspace created",
  "project.workspace_updated": "Project workspace updated",
  "project.workspace_deleted": "Project workspace deleted",

  "goal.created": "Goal created",
  "goal.updated": "Goal updated",
  "goal.deleted": "Goal deleted",

  "template.created": "Template created",
  "template.updated": "Template updated",
  "template.deleted": "Template deleted",
  "template.previewed": "Template previewed",
  "template.apply_queued": "Template apply queued",
  "template.applied": "Template applied",
  "template.imported": "Template imported",
  "template.exported": "Template exported"
};

function shortAgentId(id: string) {
  return id.length > 12 ? `${id.slice(0, 8)}…` : id;
}

function titleCaseSegment(segment: string) {
  return segment
    .split("_")
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");
}

function humanizeUnknownAuditEventType(eventType: string) {
  return eventType
    .split(".")
    .map(titleCaseSegment)
    .join(" · ");
}

function extractAuditAgentId(
  eventType: string,
  entityType: string,
  entityId: string,
  payload?: Record<string, unknown>
): string | null {
  if (eventType === "agent.hired" && entityType === "agent" && entityId) {
    return entityId;
  }
  if (!payload || typeof payload !== "object") {
    return null;
  }
  const agentId = payload.agentId;
  if (typeof agentId === "string" && agentId.length > 0) {
    return agentId;
  }
  if (payload.authorType === "agent" && typeof payload.authorId === "string" && payload.authorId.length > 0) {
    return payload.authorId;
  }
  return null;
}

export function formatAuditEventLabel(
  row: { eventType: string; entityType: string; entityId: string; payload?: Record<string, unknown> },
  resolveAgentName: (agentId: string) => string | undefined
): string {
  const base = AUDIT_EVENT_LABELS[row.eventType] ?? humanizeUnknownAuditEventType(row.eventType);
  const agentId = extractAuditAgentId(row.eventType, row.entityType, row.entityId, row.payload);
  if (!agentId) {
    return base;
  }
  const name = resolveAgentName(agentId);
  const suffix = name ?? shortAgentId(agentId);
  if (base.toLowerCase().includes(suffix.toLowerCase())) {
    return base;
  }
  return `${base} · ${suffix}`;
}

export function formatIssueActivityActorLabel(actorType: "human" | "agent" | "system") {
  if (actorType === "human") {
    return "Board";
  }
  if (actorType === "system") {
    return "System";
  }
  return "Agent";
}

type ActivityAgentLookup = { id: string; name: string };

function resolveAgentNameFromList(agentId: string | null | undefined, agents: ActivityAgentLookup[]) {
  if (!agentId) {
    return null;
  }
  return agents.find((a) => a.id === agentId)?.name ?? null;
}

function actorPhrase(
  actorType: "human" | "agent" | "system",
  actorId: string | null,
  agents: ActivityAgentLookup[]
): string {
  if (actorType === "human") {
    return "Board";
  }
  if (actorType === "system") {
    return "System";
  }
  return resolveAgentNameFromList(actorId, agents) ?? "Agent";
}

export function formatIssueActivityTitle(
  item: {
    eventType: string;
    actorType: "human" | "agent" | "system";
    actorId: string | null;
    payload: Record<string, unknown>;
  },
  agents: ActivityAgentLookup[]
): string {
  const payloadAgentId = typeof item.payload.agentId === "string" ? item.payload.agentId : null;
  const agentFromPayload = resolveAgentNameFromList(payloadAgentId, agents);
  const agentFromPayloadOrShort = agentFromPayload ?? (payloadAgentId ? shortAgentId(payloadAgentId) : null);

  switch (item.eventType) {
    case "issue.comment_added":
      return `Comment added by ${actorPhrase(item.actorType, item.actorId, agents)}`;
    case "issue.comment_updated":
      return `Comment updated by ${actorPhrase(item.actorType, item.actorId, agents)}`;
    case "issue.comment_deleted":
      return `Comment deleted by ${actorPhrase(item.actorType, item.actorId, agents)}`;
    case "issue.created":
      return "Issue created by Board";
    case "issue.updated":
      return "Issue updated by Board";
    case "issue.attachments_added": {
      const count = item.payload.count;
      const n =
        typeof count === "number" && count > 1 ? `${count} attachments` : typeof count === "number" && count === 1 ? "1 attachment" : "Attachments";
      return `${n} added by ${actorPhrase(item.actorType, item.actorId, agents)}`;
    }
    case "issue.attachment_deleted":
      return `Attachment removed by ${actorPhrase(item.actorType, item.actorId, agents)}`;
    case "issue.workspace_fallback":
      return agentFromPayloadOrShort
        ? `Workspace path fell back during a run (${agentFromPayloadOrShort})`
        : "Workspace path fell back during a run";
    case "issue.sent_to_review":
      return agentFromPayloadOrShort
        ? `Issue sent to review by ${agentFromPayloadOrShort}`
        : "Issue sent to review";
    case "issue.review_gate_blocked":
      return agentFromPayloadOrShort
        ? `Not sent to review — evidence gate (${agentFromPayloadOrShort})`
        : "Not sent to review — evidence gate";
    default:
      return item.eventType.replace(/[._]/g, " ");
  }
}
