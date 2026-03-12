import type { AdapterRuntimeUsageResolution } from "../../../../agent-sdk/src/adapters";
import { parseCursorStreamOutput as parseCursorOutput, parseStructuredUsage } from "../../../../agent-sdk/src/runtime-parsers";
export { isUnknownSessionError as isCursorUnknownSessionError, readRuntimeSessionId } from "../../../../agent-sdk/src/adapters";

export function resolveCursorRuntimeUsage(input: {
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
  const cursor = parseCursorOutput(input.stdout);
  const stderrFallback = parseStructuredUsage(input.stderr);
  if (cursor?.usage) {
    const tokenInput = cursor.usage.tokenInput ?? 0;
    const tokenOutput = cursor.usage.tokenOutput ?? 0;
    const usdCost = cursor.usage.usdCost;
    return {
      parsedUsage: {
        summary: cursor.usage.summary ?? input.parsedUsage?.summary,
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
