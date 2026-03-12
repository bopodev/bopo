import type { HeartbeatContext, AdapterExecutionResult } from "../../../../agent-sdk/src/types";
import { createSkippedResult, runGeminiCliWork } from "../../../../agent-sdk/src/adapters";

export async function execute(context: HeartbeatContext): Promise<AdapterExecutionResult> {
  if (context.workItems.length === 0) {
    return createSkippedResult("Gemini CLI", "gemini_cli", context);
  }
  return runGeminiCliWork(context);
}
