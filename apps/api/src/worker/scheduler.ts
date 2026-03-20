import type { BopoDb } from "bopodev-db";
import type { RealtimeHub } from "../realtime/hub";
import { runHeartbeatSweep } from "../services/heartbeat-service";
import { runHeartbeatQueueSweep } from "../services/heartbeat-queue-service";
import { runIssueCommentDispatchSweep } from "../services/comment-recipient-dispatch-service";

export type HeartbeatSchedulerHandle = {
  stop: () => Promise<void>;
};

export function createHeartbeatScheduler(db: BopoDb, companyId: string, realtimeHub?: RealtimeHub) {
  const heartbeatIntervalMs = Number(process.env.BOPO_HEARTBEAT_SWEEP_MS ?? 60_000);
  const queueIntervalMs = Number(process.env.BOPO_HEARTBEAT_QUEUE_SWEEP_MS ?? 2_000);
  const commentDispatchIntervalMs = Number(process.env.BOPO_COMMENT_DISPATCH_SWEEP_MS ?? 3_000);
  let heartbeatRunning = false;
  let queueRunning = false;
  let commentDispatchRunning = false;
  let heartbeatPromise: Promise<unknown> | null = null;
  let queuePromise: Promise<unknown> | null = null;
  let commentDispatchPromise: Promise<unknown> | null = null;
  const heartbeatTimer = setInterval(() => {
    if (heartbeatRunning) {
      return;
    }
    heartbeatRunning = true;
    heartbeatPromise = runHeartbeatSweep(db, companyId, { realtimeHub })
      .catch((error) => {
        // eslint-disable-next-line no-console
        console.error("[scheduler] heartbeat sweep failed", error);
      })
      .finally(() => {
        heartbeatRunning = false;
        heartbeatPromise = null;
      });
  }, heartbeatIntervalMs);
  const queueTimer = setInterval(() => {
    if (queueRunning) {
      return;
    }
    queueRunning = true;
    queuePromise = runHeartbeatQueueSweep(db, companyId, { realtimeHub })
      .catch((error) => {
        // eslint-disable-next-line no-console
        console.error("[scheduler] queue sweep failed", error);
      })
      .finally(() => {
        queueRunning = false;
        queuePromise = null;
      });
  }, queueIntervalMs);
  const commentDispatchTimer = setInterval(() => {
    if (commentDispatchRunning) {
      return;
    }
    commentDispatchRunning = true;
    commentDispatchPromise = runIssueCommentDispatchSweep(db, companyId, { realtimeHub })
      .catch((error) => {
        // eslint-disable-next-line no-console
        console.error("[scheduler] comment dispatch sweep failed", error);
      })
      .finally(() => {
        commentDispatchRunning = false;
        commentDispatchPromise = null;
      });
  }, commentDispatchIntervalMs);
  const stop = async () => {
    clearInterval(heartbeatTimer);
    clearInterval(queueTimer);
    clearInterval(commentDispatchTimer);
    await Promise.allSettled(
      [heartbeatPromise, queuePromise, commentDispatchPromise].filter(
        (promise): promise is Promise<unknown> => promise !== null
      )
    );
  };
  return { stop } satisfies HeartbeatSchedulerHandle;
}
