import type { HeartbeatContext, AdapterExecutionResult } from "../../../../agent-sdk/src/types";
import { createSkippedResult, runProviderWork, runCursorWork, runOpenCodeWork, runDirectApiWork, GenericHeartbeatAdapter } from "../../../../agent-sdk/src/adapters";

export async function execute(context: HeartbeatContext): Promise<AdapterExecutionResult> {
  if (context.workItems.length === 0) {
    return createSkippedResult("OpenCode", "opencode", context);
  }
  return runOpenCodeWork(context);
}
