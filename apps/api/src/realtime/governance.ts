import {
  ApprovalActionSchema,
  ApprovalRequestSchema,
  type ApprovalRequest,
  type RealtimeEventEnvelope,
  type RealtimeMessage
} from "bopodev-contracts";
import { listApprovalRequests, type BopoDb } from "bopodev-db";

export async function loadGovernanceRealtimeSnapshot(db: BopoDb, companyId: string): Promise<Extract<RealtimeMessage, { kind: "event" }>> {
  const approvals = await listApprovalRequests(db, companyId);

  return createRealtimeEvent(companyId, {
    channel: "governance",
    event: {
      type: "approvals.snapshot",
      approvals: approvals.filter((approval) => approval.status === "pending").map(serializeStoredApproval)
    }
  });
}

export function createGovernanceRealtimeEvent(
  companyId: string,
  event: Extract<RealtimeEventEnvelope, { channel: "governance" }>["event"]
): Extract<RealtimeMessage, { kind: "event" }> {
  return createRealtimeEvent(companyId, {
    channel: "governance",
    event
  });
}

export function serializeStoredApproval(approval: {
  id: string;
  companyId: string;
  requestedByAgentId: string | null;
  action: string;
  payloadJson: string;
  status: string;
  createdAt: Date;
  resolvedAt: Date | null;
}): ApprovalRequest {
  const actionParsed = ApprovalActionSchema.safeParse(approval.action);
  const statusParsed = ApprovalRequestSchema.shape.status.safeParse(approval.status);
  return {
    id: approval.id,
    companyId: approval.companyId,
    requestedByAgentId: approval.requestedByAgentId,
    action: actionParsed.success ? actionParsed.data : "override_budget",
    payload: parsePayload(approval.payloadJson),
    status: statusParsed.success ? statusParsed.data : "pending",
    createdAt: approval.createdAt.toISOString(),
    resolvedAt: approval.resolvedAt?.toISOString() ?? null
  };
}

function createRealtimeEvent(
  companyId: string,
  envelope: RealtimeEventEnvelope
): Extract<RealtimeMessage, { kind: "event" }> {
  return {
    kind: "event",
    companyId,
    ...envelope
  };
}

function parsePayload(payloadJson: string): Record<string, unknown> {
  try {
    const parsed = JSON.parse(payloadJson) as unknown;
    return typeof parsed === "object" && parsed !== null ? (parsed as Record<string, unknown>) : {};
  } catch {
    return {};
  }
}
