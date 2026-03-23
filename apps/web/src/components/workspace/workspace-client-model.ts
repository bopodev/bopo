import { getSupportedModelOptionsForProvider } from "@/lib/agent-runtime-options";

export const MODELS_PROVIDER_FALLBACKS = ["openai_api", "anthropic_api", "opencode", "gemini_api"] as const;

export function resolveModelCatalogProvider(providerType: string) {
  const normalizedProvider = providerType.trim();
  if (normalizedProvider === "opencode") {
    return "opencode";
  }
  if (normalizedProvider === "gemini_api" || normalizedProvider === "gemini_cli") {
    return "gemini_api";
  }
  if (normalizedProvider === "anthropic_api" || normalizedProvider === "claude_code") {
    return "anthropic_api";
  }
  if (
    normalizedProvider === "openai_api" ||
    normalizedProvider === "codex" ||
    normalizedProvider === "cursor"
  ) {
    return "openai_api";
  }
  return null;
}

export function normalizeModelIdForCatalog(providerType: string, modelId: string | null | undefined) {
  const normalizedModel = modelId?.trim();
  if (!normalizedModel) {
    return null;
  }
  if (providerType === "opencode" && normalizedModel === "big-pickle") {
    return "opencode/big-pickle";
  }
  return normalizedModel;
}

export function resolveRuntimeProviderForModelDefaults(providerType: string) {
  const normalizedProviderType = providerType.trim();
  if (
    normalizedProviderType === "codex" ||
    normalizedProviderType === "claude_code" ||
    normalizedProviderType === "opencode" ||
    normalizedProviderType === "gemini_cli" ||
    normalizedProviderType === "openai_api" ||
    normalizedProviderType === "anthropic_api" ||
    normalizedProviderType === "http" ||
    normalizedProviderType === "shell"
  ) {
    return normalizedProviderType;
  }
  if (normalizedProviderType === "gemini_api") {
    return "gemini_cli";
  }
  return null;
}

export function parseRuntimeModelFromStateBlob(rawStateBlob: string | undefined) {
  if (!rawStateBlob) {
    return "";
  }
  try {
    const parsed = JSON.parse(rawStateBlob) as { runtime?: { model?: unknown } };
    return typeof parsed.runtime?.model === "string" ? parsed.runtime.model : "";
  } catch {
    return "";
  }
}

export function resolveNamedModelForAgent(agent: {
  providerType: string;
  runtimeModel?: string | null;
  stateBlob?: string;
}) {
  const configuredModel = agent.runtimeModel?.trim() || parseRuntimeModelFromStateBlob(agent.stateBlob);
  if (configuredModel) {
    return configuredModel;
  }
  const runtimeProvider = resolveRuntimeProviderForModelDefaults(agent.providerType);
  if (!runtimeProvider) {
    return null;
  }
  const fallback = getSupportedModelOptionsForProvider(runtimeProvider).find((option) => option.value.trim().length > 0);
  return fallback?.value ?? null;
}
