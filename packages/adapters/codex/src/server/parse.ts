import type { AdapterRuntimeUsageResolution } from "../../../../agent-sdk/src/adapters";
import { parseStructuredUsage } from "../../../../agent-sdk/src/runtime-parsers";
export { isUnknownSessionError as isCodexUnknownSessionError } from "../../../../agent-sdk/src/adapters";

function toNumber(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === "string") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }
  return undefined;
}

function firstText(value: unknown) {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : undefined;
}

function parseCodexStructuredUsageFromText(text: string) {
  let inputTokens = 0;
  let cachedInputTokens = 0;
  let outputTokens = 0;
  let costUsd = 0;
  let sawUsage = false;
  let summary: string | undefined;

  const readUsageObject = (raw: unknown) => {
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
      return;
    }
    const usage = raw as Record<string, unknown>;
    const input =
      toNumber(usage.input_tokens) ??
      toNumber(usage.inputTokens) ??
      toNumber(usage.prompt_tokens) ??
      toNumber(usage.promptTokens) ??
      0;
    const cached =
      toNumber(usage.cached_input_tokens) ??
      toNumber(usage.cachedInputTokens) ??
      toNumber(usage.cache_read_input_tokens) ??
      toNumber(usage.cacheReadInputTokens) ??
      0;
    const output =
      toNumber(usage.output_tokens) ??
      toNumber(usage.outputTokens) ??
      toNumber(usage.completion_tokens) ??
      toNumber(usage.completionTokens) ??
      0;
    if (input > 0 || cached > 0 || output > 0) {
      inputTokens += input;
      cachedInputTokens += cached;
      outputTokens += output;
      sawUsage = true;
    }
  };

  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line.startsWith("{") || !line.endsWith("}")) {
      continue;
    }
    let parsed: Record<string, unknown>;
    try {
      parsed = JSON.parse(line) as Record<string, unknown>;
    } catch {
      continue;
    }
    summary = summary ?? firstText(parsed.summary) ?? firstText(parsed.result) ?? firstText(parsed.message);
    readUsageObject(parsed);
    readUsageObject(parsed.usage);
    readUsageObject(parsed.metrics);
    costUsd += toNumber(parsed.total_cost_usd) ?? toNumber(parsed.cost_usd) ?? toNumber(parsed.cost) ?? 0;
  }

  if (!sawUsage && costUsd <= 0 && !summary) {
    return undefined;
  }
  return {
    summary,
    inputTokens,
    cachedInputTokens,
    outputTokens,
    costUsd: costUsd > 0 ? costUsd : undefined
  };
}

export function resolveCodexRuntimeUsage(input: {
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
  const stdoutUsage = parseCodexStructuredUsageFromText(input.stdout);
  const stderrUsage = parseCodexStructuredUsageFromText(input.stderr);
  const fallbackStdout = parseStructuredUsage(input.stdout);
  const fallbackStderr = parseStructuredUsage(input.stderr);

  const source = stderrUsage
    ? "stderr"
    : stdoutUsage
      ? "stdout"
      : fallbackStderr
        ? "stderr"
        : fallbackStdout
          ? "stdout"
          : input.structuredOutputSource;

  const resolved = stderrUsage ?? stdoutUsage;
  if (resolved) {
    return {
      parsedUsage: {
        summary: resolved.summary ?? input.parsedUsage?.summary,
        inputTokens: resolved.inputTokens,
        cachedInputTokens: resolved.cachedInputTokens,
        outputTokens: resolved.outputTokens,
        costUsd: resolved.costUsd,
        tokenInput: resolved.inputTokens + resolved.cachedInputTokens,
        tokenOutput: resolved.outputTokens,
        usdCost: resolved.costUsd
      },
      structuredOutputSource: source
    };
  }

  const fallback = fallbackStdout ?? fallbackStderr ?? input.parsedUsage;
  return {
    parsedUsage: fallback,
    structuredOutputSource: source
  };
}
