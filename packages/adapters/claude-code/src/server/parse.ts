import type { AdapterRuntimeUsageResolution } from "../../../../agent-sdk/src/adapters";
import { parseClaudeStreamOutput as parseClaudeOutput, parseStructuredUsage } from "../../../../agent-sdk/src/runtime-parsers";
export { isClaudeRunIncomplete, isUnknownSessionError as isClaudeUnknownSessionError } from "../../../../agent-sdk/src/adapters";

export function resolveClaudeRuntimeUsage(input: {
  stdout: string;
  stderr: string;
  parsedUsage?: {
    tokenInput?: number;
    tokenOutput?: number;
    usdCost?: number;
    summary?: string;
  };
  structuredOutputSource?: "stdout" | "stderr";
}): AdapterRuntimeUsageResolution {
  const parsed = parseClaudeOutput(input.stdout);
  const stderrFallback = parseStructuredUsage(input.stderr);
  if (parsed?.usage) {
    const tokenInput = parsed.usage.tokenInput ?? 0;
    const tokenOutput = parsed.usage.tokenOutput ?? 0;
    const usdCost = parsed.usage.usdCost;
    return {
      parsedUsage: {
        summary: parsed.usage.summary ?? input.parsedUsage?.summary,
        inputTokens: tokenInput,
        cachedInputTokens: 0,
        outputTokens: tokenOutput,
        costUsd: usdCost,
        tokenInput,
        tokenOutput,
        usdCost
      },
      structuredOutputSource: "stdout"
    };
  }
  if (stderrFallback) {
    return { parsedUsage: stderrFallback, structuredOutputSource: "stderr" };
  }
  return {
    parsedUsage: input.parsedUsage,
    structuredOutputSource: input.structuredOutputSource
  };
}
