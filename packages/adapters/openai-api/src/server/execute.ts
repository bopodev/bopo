import type { HeartbeatContext, AdapterExecutionResult } from "../../../../agent-sdk/src/types";
import {
  classifyProviderFailure,
  createPrompt,
  createSkippedResult,
  withProviderMetadata
} from "../../../../agent-sdk/src/adapters";
import { executeDirectApiRuntime } from "../../../../agent-sdk/src/runtime-http";
import { ExecutionOutcomeSchema, type ExecutionOutcome } from "../../../../contracts/src/index";

export async function execute(context: HeartbeatContext): Promise<AdapterExecutionResult> {
  if (context.workItems.length === 0) {
    return createSkippedResult("OpenAI API", "openai_api", context);
  }
  const prompt = createPrompt(context);
  const runtime = await executeDirectApiRuntime("openai_api", prompt, context.runtime);
  if (runtime.ok) {
    return {
      status: "ok",
      summary: runtime.summary ?? `openai_api runtime finished in ${runtime.elapsedMs}ms.`,
      tokenInput: runtime.tokenInput ?? 0,
      tokenOutput: runtime.tokenOutput ?? 0,
      usdCost: runtime.usdCost ?? 0,
      pricingProviderType: runtime.provider,
      pricingModelId: runtime.model,
      outcome: toOutcome({
        kind: "completed",
        issueIdsTouched: issueIdsTouched(context),
        actions: [{ type: "runtime.execute", status: "ok", detail: "openai_api runtime completed." }],
        blockers: [],
        artifacts: [],
        nextSuggestedState: "in_review"
      }),
      trace: {
        command: runtime.endpoint,
        cwd: context.runtime?.cwd,
        exitCode: runtime.statusCode,
        elapsedMs: runtime.elapsedMs,
        failureType: runtime.failureType,
        usageSource: "structured",
        attemptCount: runtime.attemptCount,
        attempts: runtime.attempts.map((attempt) => ({
          attempt: attempt.attempt,
          code: attempt.statusCode || null,
          timedOut: attempt.failureType === "timeout",
          elapsedMs: attempt.elapsedMs,
          signal: null,
          forcedKill: false
        })),
        stdoutPreview: runtime.responsePreview
      },
      nextState: withProviderMetadata(context, "openai_api", runtime.elapsedMs, runtime.statusCode)
    };
  }
  const failure = classifyProviderFailure("openai_api", {
    detail: runtime.error ?? "direct API request failed",
    stderr: runtime.error,
    stdout: runtime.responsePreview ?? "",
    failureType: runtime.failureType
  });
  return {
    status: "failed",
    summary: `openai_api runtime failed: ${failure.detail}`,
    tokenInput: 0,
    tokenOutput: 0,
    usdCost: 0,
    pricingProviderType: "openai_api",
    pricingModelId: context.runtime?.model?.trim() || null,
    outcome: toOutcome({
      kind: "failed",
      issueIdsTouched: issueIdsTouched(context),
      actions: [{ type: "runtime.execute", status: "error", detail: failure.detail }],
      blockers: [
        {
          code: failure.blockerCode,
          message: failure.detail,
          retryable: failure.retryable
        }
      ],
      artifacts: [],
      nextSuggestedState: "blocked"
    }),
    trace: {
      command: runtime.endpoint,
      cwd: context.runtime?.cwd,
      exitCode: runtime.statusCode || null,
      elapsedMs: runtime.elapsedMs,
      failureType: runtime.failureType,
      usageSource: "none",
      attemptCount: runtime.attemptCount,
      attempts: runtime.attempts.map((attempt) => ({
        attempt: attempt.attempt,
        code: attempt.statusCode || null,
        timedOut: attempt.failureType === "timeout",
        elapsedMs: attempt.elapsedMs,
        signal: null,
        forcedKill: false
      })),
      stderrPreview: runtime.error,
      stdoutPreview: runtime.responsePreview
    },
    ...(failure.providerUsageLimited
      ? {
          dispositionHint: {
            kind: "provider_usage_limited" as const,
            persistStatus: "skipped" as const,
            pauseAgent: true,
            notifyBoard: true,
            message: `openai_api usage limit reached: ${failure.detail}`
          }
        }
      : {}),
    nextState: context.state
  };
}

function issueIdsTouched(context: HeartbeatContext) {
  return context.workItems.map((item) => item.issueId);
}

function toOutcome(outcome: ExecutionOutcome): ExecutionOutcome {
  return ExecutionOutcomeSchema.parse(outcome);
}
