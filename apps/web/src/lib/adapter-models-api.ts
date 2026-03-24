import { apiPost } from "@/lib/api";
import type { ServerAdapterModelEntry } from "@/lib/model-registry-options";

export type FetchAdapterModelsBody = Record<string, unknown>;

export async function fetchAdapterModelsForProvider(
  companyId: string,
  providerType: string,
  body: FetchAdapterModelsBody = {}
): Promise<ServerAdapterModelEntry[]> {
  const res = await apiPost<{ providerType: string; models: ServerAdapterModelEntry[] }>(
    `/agents/adapter-models/${encodeURIComponent(providerType)}`,
    companyId,
    body
  );
  return res.data.models ?? [];
}

/** Build POST body for adapter-models from persisted agent columns (server normalizes cwd). */
export function buildAdapterModelsRequestBody(agent: {
  runtimeCommand?: string | null;
  runtimeArgsJson?: string | null;
  runtimeCwd?: string | null;
  runtimeEnvJson?: string | null;
  runtimeModel?: string | null;
  runtimeThinkingEffort?: string | null;
  bootstrapPrompt?: string | null;
  runtimeTimeoutSec?: number | null;
  interruptGraceSec?: number | null;
  runPolicyJson?: string | null;
}): FetchAdapterModelsBody {
  let runtimeArgs: string[] = [];
  if (agent.runtimeArgsJson?.trim()) {
    try {
      const parsed = JSON.parse(agent.runtimeArgsJson) as unknown;
      if (Array.isArray(parsed)) {
        runtimeArgs = parsed.filter((item): item is string => typeof item === "string");
      }
    } catch {
      // ignore
    }
  }
  let runtimeEnv: Record<string, string> = {};
  if (agent.runtimeEnvJson?.trim()) {
    try {
      const parsed = JSON.parse(agent.runtimeEnvJson) as unknown;
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        runtimeEnv = Object.fromEntries(
          Object.entries(parsed as Record<string, unknown>).filter(([, v]) => typeof v === "string")
        ) as Record<string, string>;
      }
    } catch {
      // ignore
    }
  }
  let runPolicy: { sandboxMode: "workspace_write" | "full_access"; allowWebSearch: boolean } = {
    sandboxMode: "workspace_write",
    allowWebSearch: false
  };
  if (agent.runPolicyJson?.trim()) {
    try {
      const parsed = JSON.parse(agent.runPolicyJson) as {
        sandboxMode?: unknown;
        allowWebSearch?: unknown;
      };
      runPolicy = {
        sandboxMode: parsed.sandboxMode === "full_access" ? "full_access" : "workspace_write",
        allowWebSearch: Boolean(parsed.allowWebSearch)
      };
    } catch {
      // ignore
    }
  }
  const thinking = agent.runtimeThinkingEffort;
  const runtimeThinkingEffort =
    thinking === "low" || thinking === "medium" || thinking === "high" ? thinking : "auto";

  return {
    runtimeConfig: {
      runtimeCommand: agent.runtimeCommand?.trim() || undefined,
      runtimeArgs,
      runtimeCwd: agent.runtimeCwd?.trim() || undefined,
      runtimeEnv,
      runtimeModel: agent.runtimeModel?.trim() || undefined,
      runtimeThinkingEffort,
      bootstrapPrompt: agent.bootstrapPrompt?.trim() || undefined,
      runtimeTimeoutSec: Math.max(0, agent.runtimeTimeoutSec ?? 0),
      interruptGraceSec: Math.max(0, agent.interruptGraceSec ?? 15),
      runPolicy
    }
  };
}
