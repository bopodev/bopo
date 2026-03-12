import type { HeartbeatContext, AdapterExecutionResult } from "../../../../agent-sdk/src/types";
import { createSkippedResult, runProviderWork, runCursorWork, runOpenCodeWork, runDirectApiWork, GenericHeartbeatAdapter } from "../../../../agent-sdk/src/adapters";
import { resolveCodexRuntimeUsage } from "./parse";

export async function execute(context: HeartbeatContext): Promise<AdapterExecutionResult> {
  if (context.workItems.length === 0) {
    return createSkippedResult("Codex", "codex", context);
  }
  return runProviderWork(
    context,
    "codex",
    { inputRate: 0.0000015, outputRate: 0.000008 },
    { usageResolver: resolveCodexRuntimeUsage }
  );
}
