import type {
  HeartbeatRunRealtimeEvent,
  RealtimeEventEnvelope,
  RealtimeMessage
} from "bopodev-contracts";
import { listHeartbeatRunMessagesForRuns, listHeartbeatRuns, type BopoDb } from "bopodev-db";

export function createHeartbeatRunsRealtimeEvent(
  companyId: string,
  event: HeartbeatRunRealtimeEvent
): Extract<RealtimeMessage, { kind: "event" }> {
  return createRealtimeEvent(companyId, {
    channel: "heartbeat-runs",
    event
  });
}

export async function loadHeartbeatRunsRealtimeSnapshot(
  db: BopoDb,
  companyId: string
): Promise<Extract<RealtimeMessage, { kind: "event" }>> {
  const runs = await listHeartbeatRuns(db, companyId, 8);
  const transcriptsByRunId = await listHeartbeatRunMessagesForRuns(db, {
    companyId,
    runIds: runs.map((run) => run.id),
    perRunLimit: 60
  });
  const transcripts = runs.map((run) => {
    const result = transcriptsByRunId.get(run.id) ?? { items: [], nextCursor: null };
    return {
      runId: run.id,
      messages: result.items.map((message) => ({
        id: message.id,
        runId: message.runId,
        sequence: message.sequence,
        kind: message.kind as
          | "system"
          | "assistant"
          | "thinking"
          | "tool_call"
          | "tool_result"
          | "result"
          | "stderr",
        label: message.label,
        text: message.text,
        payload: message.payloadJson,
        signalLevel: (message.signalLevel as "high" | "medium" | "low" | "noise" | null) ?? undefined,
        groupKey: message.groupKey,
        source: (message.source as "stdout" | "stderr" | "trace_fallback" | null) ?? undefined,
        createdAt: message.createdAt.toISOString()
      })),
      nextCursor: result.nextCursor
    };
  });

  return createHeartbeatRunsRealtimeEvent(companyId, {
    type: "runs.snapshot",
    runs: runs.map((run) => ({
      runId: run.id,
      status: run.status as "started" | "completed" | "failed" | "skipped",
      message: run.message ?? null,
      startedAt: run.startedAt.toISOString(),
      finishedAt: run.finishedAt?.toISOString() ?? null
    })),
    transcripts
  });
}

function createRealtimeEvent(
  companyId: string,
  envelope: Extract<RealtimeEventEnvelope, { channel: "heartbeat-runs" }>
): Extract<RealtimeMessage, { kind: "event" }> {
  return {
    kind: "event",
    companyId,
    ...envelope
  };
}
