import type { BopoDb } from "bopodev-db";
import type { RealtimeHub } from "./realtime/hub";

export interface AppContext {
  db: BopoDb;
  getRuntimeHealth?: () => Promise<Record<string, unknown>>;
  realtimeHub?: RealtimeHub;
}
