import type { HeartbeatContext, AdapterExecutionResult } from "../../../../agent-sdk/src/types";
import { createSkippedResult, runProviderWork, runCursorWork, runOpenCodeWork, runDirectApiWork, GenericHeartbeatAdapter } from "../../../../agent-sdk/src/adapters";
import { resolveClaudeRuntimeUsage } from "./parse";

export async function execute(context: HeartbeatContext): Promise<AdapterExecutionResult> {
  if (context.workItems.length === 0) {
    return createSkippedResult("Claude Code", "claude_code", context);
  }
  return runProviderWork(
    context,
    "claude_code",
    { inputRate: 0.000002, outputRate: 0.00001 },
    { usageResolver: resolveClaudeRuntimeUsage }
  );
}
