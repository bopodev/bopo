type RuntimeState = {
  command?: string;
  args?: string[];
  cwd?: string;
  timeoutMs?: number;
  interruptGraceSec?: number;
  env?: Record<string, string>;
  model?: string;
  thinkingEffort?: "auto" | "low" | "medium" | "high";
  runPolicy?: {
    sandboxMode?: "workspace_write" | "full_access";
    allowWebSearch?: boolean;
  };
};

type RuntimeColumns = {
  runtimeCommand?: string | null;
  runtimeArgsJson?: string | null;
  runtimeCwd?: string | null;
  runtimeEnvJson?: string | null;
  runtimeModel?: string | null;
  runtimeThinkingEffort?: "auto" | "low" | "medium" | "high" | null;
  runtimeTimeoutSec?: number | null;
  interruptGraceSec?: number | null;
  runPolicyJson?: string | null;
};

type RunSummaryOutcome = {
  kind?: string | null;
  blockers?: Array<{ message?: string | null }> | null;
  actions?: Array<{ detail?: string | null }> | null;
};

export function summarizeRunMessage(
  status: string,
  message: string | null | undefined,
  outcome?: RunSummaryOutcome | null
) {
  if (outcome) {
    if (outcome.kind === "blocked" || outcome.kind === "failed") {
      const blocker = outcome.blockers?.[0];
      if (blocker?.message) {
        return blocker.message;
      }
    }
    const firstActionDetail = outcome.actions?.[0]?.detail;
    if (firstActionDetail) {
      return firstActionDetail;
    }
  }
  if (!message || message.trim().length === 0) {
    if (status === "completed") {
      return "Completed successfully.";
    }
    if (status === "running") {
      return "Run is currently in progress.";
    }
    return "No additional details were provided.";
  }

  const normalizedMessage = message.replace(/\s+/g, " ").trim();
  const lower = normalizedMessage.toLowerCase();

  if (status === "completed") {
    return "Completed successfully.";
  }
  if (lower.includes("credentials missing")) {
    return "Missing runtime credentials. Configure provider API keys for this agent runtime.";
  }
  if (lower.includes("timed out")) {
    return "Run timed out before completion.";
  }

  const errorTail = normalizedMessage.match(/error:\s*(.*)$/i)?.[1] ?? normalizedMessage;
  const firstSentence = errorTail.split(/[.;](?:\s|$)/)[0]?.trim() ?? errorTail;
  if (firstSentence.length <= 120) {
    return firstSentence;
  }
  return `${firstSentence.slice(0, 117)}...`;
}

export function parseRuntimeFromAgentColumns(agent: RuntimeColumns): RuntimeState | null {
  const parsedArgs = (() => {
    if (!agent.runtimeArgsJson) {
      return undefined;
    }
    try {
      const parsed = JSON.parse(agent.runtimeArgsJson) as unknown;
      return Array.isArray(parsed) ? parsed.map((entry) => String(entry)) : undefined;
    } catch {
      return undefined;
    }
  })();
  const parsedEnv = (() => {
    if (!agent.runtimeEnvJson) {
      return undefined;
    }
    try {
      const parsed = JSON.parse(agent.runtimeEnvJson) as Record<string, unknown>;
      return Object.fromEntries(Object.entries(parsed).filter(([, value]) => typeof value === "string")) as Record<
        string,
        string
      >;
    } catch {
      return undefined;
    }
  })();
  const parsedRunPolicy = (() => {
    if (!agent.runPolicyJson) {
      return undefined;
    }
    try {
      const parsed = JSON.parse(agent.runPolicyJson) as { sandboxMode?: unknown; allowWebSearch?: unknown };
      return {
        sandboxMode: parsed.sandboxMode === "full_access" ? "full_access" : "workspace_write",
        allowWebSearch: Boolean(parsed.allowWebSearch)
      } as const;
    } catch {
      return undefined;
    }
  })();
  const hasColumnRuntime =
    Boolean(agent.runtimeCommand) ||
    Boolean(agent.runtimeCwd) ||
    Boolean(agent.runtimeModel) ||
    Boolean(parsedArgs?.length) ||
    Boolean(parsedEnv && Object.keys(parsedEnv).length > 0);
  if (!hasColumnRuntime) {
    return null;
  }
  return {
    command: agent.runtimeCommand ?? undefined,
    args: parsedArgs,
    cwd: agent.runtimeCwd ?? undefined,
    env: parsedEnv,
    timeoutMs: typeof agent.runtimeTimeoutSec === "number" ? agent.runtimeTimeoutSec * 1000 : undefined,
    model: agent.runtimeModel ?? undefined,
    thinkingEffort: agent.runtimeThinkingEffort ?? undefined,
    interruptGraceSec: typeof agent.interruptGraceSec === "number" ? agent.interruptGraceSec : undefined,
    runPolicy: parsedRunPolicy
  };
}
