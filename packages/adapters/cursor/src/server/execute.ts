import type { HeartbeatContext, AdapterExecutionResult } from "../../../../agent-sdk/src/types";
import { createSkippedResult, runProviderWork, runCursorWork, runOpenCodeWork, runDirectApiWork, GenericHeartbeatAdapter } from "../../../../agent-sdk/src/adapters";
import { resolveCursorRuntimeUsage } from "./parse";

export async function execute(context: HeartbeatContext): Promise<AdapterExecutionResult> {
  if (context.workItems.length === 0) {
    return createSkippedResult("Cursor", "cursor", context);
  }
  return runCursorWork(context, { usageResolver: resolveCursorRuntimeUsage });
}
