import {
  ExecutionOutcomeSchema,
  type AgentFinalRunOutput,
  type ExecutionOutcome
} from "../../../../contracts/src/index";
import type { HeartbeatContext, AdapterExecutionResult } from "../../../../agent-sdk/src/types";
import { createPrompt, createSkippedResult, withProviderMetadata } from "../../../../agent-sdk/src/adapters";
import { runOpenClawGatewayTurn } from "./gateway-client";
import { mapOpenClawModelProviderToBopoPricingType } from "./parse";

function issueIdsTouched(context: HeartbeatContext) {
  return context.workItems.map((item) => item.issueId);
}

function toOutcome(outcome: ExecutionOutcome): ExecutionOutcome {
  return ExecutionOutcomeSchema.parse(outcome);
}

function envBool(env: Record<string, string> | undefined, key: string): boolean {
  const v = env?.[key]?.trim().toLowerCase();
  return v === "1" || v === "true" || v === "yes";
}

function parsePositiveInt(value: string | undefined, fallback: number): number {
  if (!value?.trim()) {
    return fallback;
  }
  const n = Number.parseInt(value.trim(), 10);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

function normalizePemFromEnv(raw: string | undefined): string | null {
  if (!raw?.trim()) {
    return null;
  }
  return raw.trim().replace(/\\n/g, "\n");
}

function parseSessionStrategy(raw: string | undefined): "issue" | "run" | "fixed" {
  const v = raw?.trim().toLowerCase();
  if (v === "run" || v === "fixed") {
    return v;
  }
  return "issue";
}

function buildSyntheticFinalOutput(summary: string): AgentFinalRunOutput {
  const clip = summary.trim().slice(0, 8000) || "OpenClaw gateway run finished.";
  return {
    employee_comment: clip,
    results: [clip.slice(0, 500)],
    errors: [],
    artifacts: []
  };
}

export async function execute(context: HeartbeatContext): Promise<AdapterExecutionResult> {
  if (context.workItems.length === 0) {
    return createSkippedResult("OpenClaw Gateway", "openclaw_gateway", context);
  }

  const env = context.runtime?.env ?? {};
  const gatewayUrl =
    context.runtime?.command?.trim() ||
    env.OPENCLAW_GATEWAY_URL?.trim() ||
    "";

  if (!gatewayUrl.startsWith("ws://") && !gatewayUrl.startsWith("wss://")) {
    return {
      status: "failed",
      summary:
        "OpenClaw Gateway adapter requires a WebSocket URL in runtime command or OPENCLAW_GATEWAY_URL (ws:// or wss://).",
      tokenInput: 0,
      tokenOutput: 0,
      usdCost: 0,
      pricingProviderType: null,
      pricingModelId: context.runtime?.model?.trim() || null,
      outcome: toOutcome({
        kind: "failed",
        issueIdsTouched: issueIdsTouched(context),
        actions: [{ type: "runtime.launch", status: "error", detail: "Missing gateway WebSocket URL." }],
        blockers: [{ code: "openclaw_gateway_url_missing", message: "Configure ws:// or wss:// URL.", retryable: false }],
        artifacts: [],
        nextSuggestedState: "blocked"
      }),
      nextState: context.state
    };
  }

  const token = env.OPENCLAW_GATEWAY_TOKEN?.trim() || null;
  const password = env.OPENCLAW_GATEWAY_PASSWORD?.trim() || null;
  if (!token && !password) {
    return {
      status: "failed",
      summary: "OpenClaw Gateway requires OPENCLAW_GATEWAY_TOKEN or OPENCLAW_GATEWAY_PASSWORD in runtime environment.",
      tokenInput: 0,
      tokenOutput: 0,
      usdCost: 0,
      pricingProviderType: null,
      pricingModelId: context.runtime?.model?.trim() || null,
      outcome: toOutcome({
        kind: "failed",
        issueIdsTouched: issueIdsTouched(context),
        actions: [{ type: "runtime.launch", status: "error", detail: "Missing gateway credentials." }],
        blockers: [
          {
            code: "openclaw_gateway_auth_missing",
            message: "Set OPENCLAW_GATEWAY_TOKEN or OPENCLAW_GATEWAY_PASSWORD.",
            retryable: false
          }
        ],
        artifacts: [],
        nextSuggestedState: "blocked"
      }),
      nextState: context.state
    };
  }

  const prompt = createPrompt(context);
  const primaryIssueId = context.workItems[0]?.issueId ?? null;

  const connectTimeoutMs = Math.max(5000, context.runtime?.timeoutMs ?? 120_000);
  const agentWaitTimeoutMs = parsePositiveInt(env.OPENCLAW_AGENT_WAIT_MS, Math.max(connectTimeoutMs, 900_000));

  const stdoutLines: string[] = [];
  const onStdoutLine = (line: string) => {
    stdoutLines.push(line);
  };

  const result = await runOpenClawGatewayTurn({
    gatewayUrl,
    token,
    password,
    devicePrivateKeyPem: normalizePemFromEnv(env.OPENCLAW_DEVICE_PRIVATE_KEY_PEM),
    disableDeviceAuth: envBool(env, "BOPO_OPENCLAW_DISABLE_DEVICE_AUTH"),
    agentId: env.OPENCLAW_AGENT_ID?.trim() || null,
    openclawSessionKey: env.OPENCLAW_SESSION_KEY?.trim() || null,
    sessionKeyStrategy: parseSessionStrategy(env.OPENCLAW_SESSION_KEY_STRATEGY),
    primaryIssueId,
    agentTimeoutSec: context.runtime?.timeoutMs ? Math.ceil(context.runtime.timeoutMs / 1000) : null,
    model: context.runtime?.model?.trim() || null,
    message: prompt,
    idempotencyKey: context.heartbeatRunId,
    connectTimeoutMs,
    agentWaitTimeoutMs,
    onStdoutLine,
    onTranscriptEvent: context.runtime?.onTranscriptEvent,
    abortSignal: context.runtime?.abortSignal
  });

  const stdoutPreview = stdoutLines.join("").slice(-8000);
  const hasReportedUsage =
    result.tokenInput + result.tokenOutput + result.cachedInputTokens > 0 || result.usdCost > 0;
  const baseTrace = {
    command: gatewayUrl,
    cwd: context.runtime?.cwd,
    exitCode: result.ok ? 0 : 1,
    timedOut: result.timedOut ?? false,
    failureType: result.ok ? undefined : result.timedOut ? ("timeout" as const) : ("nonzero_exit" as const),
    usageSource: (hasReportedUsage ? "structured" : "none") as "structured" | "none",
    attemptCount: 1,
    attempts: [
      {
        attempt: 1,
        code: result.ok ? 0 : 1,
        timedOut: result.timedOut ?? false,
        elapsedMs: 0,
        signal: null as NodeJS.Signals | null,
        forcedKill: false
      }
    ],
    stdoutPreview,
    transcript: [] as NonNullable<AdapterExecutionResult["trace"]>["transcript"]
  };

  if (!result.ok) {
    return {
      status: "failed",
      summary: result.summary,
      tokenInput: 0,
      tokenOutput: 0,
      usdCost: 0,
      pricingProviderType: null,
      pricingModelId: context.runtime?.model?.trim() || null,
      outcome: toOutcome({
        kind: "failed",
        issueIdsTouched: issueIdsTouched(context),
        actions: [{ type: "runtime.execute", status: "error", detail: result.errorMessage ?? result.summary }],
        blockers: [
          {
            code: "openclaw_gateway_error",
            message: result.errorMessage ?? result.summary,
            retryable: result.timedOut === true
          }
        ],
        artifacts: [],
        nextSuggestedState: "blocked"
      }),
      trace: baseTrace,
      nextState: withProviderMetadata(context, "openclaw_gateway")
    };
  }

  const finalRunOutput = buildSyntheticFinalOutput(result.summary);

  return {
    status: "ok",
    summary: result.summary,
    tokenInput: result.tokenInput,
    tokenOutput: result.tokenOutput,
    usdCost: result.usdCost,
    finalRunOutput,
    usage: {
      inputTokens: result.tokenInput,
      cachedInputTokens: result.cachedInputTokens,
      outputTokens: result.tokenOutput,
      costUsd: result.usdCost
    },
    pricingProviderType: mapOpenClawModelProviderToBopoPricingType(result.openclawModelProvider),
    pricingModelId: result.model ?? context.runtime?.model?.trim() ?? null,
    outcome: toOutcome({
      kind: "completed",
      issueIdsTouched: issueIdsTouched(context),
      actions: [{ type: "runtime.execute", status: "ok", detail: "OpenClaw gateway agent run completed." }],
      blockers: [],
      artifacts: [],
      nextSuggestedState: "in_review"
    }),
    trace: baseTrace,
    nextState: withProviderMetadata(context, "openclaw_gateway")
  };
}
