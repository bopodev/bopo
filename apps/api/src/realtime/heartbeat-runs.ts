import type {
  HeartbeatRunRealtimeEvent,
  HeartbeatRunTranscriptEventKind,
  HeartbeatRunTranscriptSignalLevel,
  HeartbeatRunTranscriptSource,
  RealtimeEventEnvelope,
  RealtimeMessage
} from "bopodev-contracts";
import {
  HeartbeatRunSchema,
  HeartbeatRunTranscriptEventKindSchema,
  HeartbeatRunTranscriptSignalLevelSchema,
  HeartbeatRunTranscriptSourceSchema
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
        kind: parseTranscriptKind(message.kind),
        label: message.label,
        text: message.text,
        payload: message.payloadJson,
        signalLevel: parseTranscriptSignalLevel(message.signalLevel),
        groupKey: message.groupKey,
        source: parseTranscriptSource(message.source),
        createdAt: message.createdAt.toISOString()
      })),
      nextCursor: result.nextCursor
    };
  });

  return createHeartbeatRunsRealtimeEvent(companyId, {
    type: "runs.snapshot",
    runs: runs.map((run) => ({
      runId: run.id,
      status: parseRunStatus(run.status),
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

function parseRunStatus(value: string) {
  const parsed = HeartbeatRunSchema.shape.status.safeParse(value);
  return parsed.success ? parsed.data : "failed";
}

function parseTranscriptKind(value: string): HeartbeatRunTranscriptEventKind {
  const parsed = HeartbeatRunTranscriptEventKindSchema.safeParse(value);
  return parsed.success ? parsed.data : "system";
}

function parseTranscriptSignalLevel(value: string | null): HeartbeatRunTranscriptSignalLevel | undefined {
  const parsed = HeartbeatRunTranscriptSignalLevelSchema.safeParse(value);
  return parsed.success ? parsed.data : undefined;
}

function parseTranscriptSource(value: string | null): HeartbeatRunTranscriptSource | undefined {
  const parsed = HeartbeatRunTranscriptSourceSchema.safeParse(value);
  return parsed.success ? parsed.data : undefined;
}
