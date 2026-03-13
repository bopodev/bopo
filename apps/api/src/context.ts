import type { BopoDb } from "bopodev-db";
import type { RealtimeHub } from "./realtime/hub";
import type { DeploymentMode } from "./security/deployment-mode";

export interface AppContext {
  db: BopoDb;
  deploymentMode?: DeploymentMode;
  allowedOrigins?: string[];
  getRuntimeHealth?: () => Promise<Record<string, unknown>>;
  realtimeHub?: RealtimeHub;
}
