import type { BopoDb } from "bopodev-db";
import type { RealtimeHub } from "../realtime/hub";
import { runHeartbeatSweep } from "../services/heartbeat-service";

export function createHeartbeatScheduler(db: BopoDb, companyId: string, realtimeHub?: RealtimeHub) {
  const intervalMs = Number(process.env.BOPO_HEARTBEAT_SWEEP_MS ?? 60_000);
  let running = false;
  const timer = setInterval(() => {
    if (running) {
      return;
    }
    running = true;
    void runHeartbeatSweep(db, companyId, { realtimeHub })
      .catch((error) => {
        // eslint-disable-next-line no-console
        console.error("[scheduler] heartbeat sweep failed", error);
      })
      .finally(() => {
        running = false;
      });
  }, intervalMs);
  return () => clearInterval(timer);
}
