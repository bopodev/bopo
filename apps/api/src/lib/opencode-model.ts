import type { NormalizedRuntimeConfig } from "./agent-config";

export async function resolveOpencodeRuntimeModel(
  providerType: string,
  runtimeConfig: NormalizedRuntimeConfig
): Promise<string | undefined> {
  if (providerType !== "opencode") {
    return runtimeConfig.runtimeModel?.trim() || undefined;
  }
  return runtimeConfig.runtimeModel?.trim() || undefined;
}
