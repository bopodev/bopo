import { getAdapterModels } from "bopodev-agent-sdk";
import type { NormalizedRuntimeConfig } from "./agent-config";

export async function resolveOpencodeRuntimeModel(
  providerType: string,
  runtimeConfig: NormalizedRuntimeConfig
): Promise<string | undefined> {
  if (providerType !== "opencode") {
    return runtimeConfig.runtimeModel;
  }
  if (runtimeConfig.runtimeModel?.trim()) {
    return runtimeConfig.runtimeModel.trim();
  }

  const configured =
    process.env.BOPO_OPENCODE_MODEL?.trim() ||
    process.env.OPENCODE_MODEL?.trim() ||
    undefined;
  try {
    const discovered = await getAdapterModels("opencode", {
      command: runtimeConfig.runtimeCommand,
      cwd: runtimeConfig.runtimeCwd,
      env: runtimeConfig.runtimeEnv
    });
    if (configured && discovered.some((entry) => entry.id === configured)) {
      return configured;
    }
    if (discovered.length > 0) {
      return discovered[0]!.id;
    }
  } catch {
    // Fall back to configured env default when discovery is unavailable.
  }
  return configured;
}
