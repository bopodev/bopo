type CanonicalPricingProvider = "openai_api" | "anthropic_api" | "opencode";

export type RuntimeProviderType =
  | "claude_code"
  | "codex"
  | "cursor"
  | "opencode"
  | "openai_api"
  | "anthropic_api"
  | "http"
  | "shell";

export type ModelRegistryRow = {
  providerType: string;
  modelId: string;
  displayName?: string | null;
};

export type ModelOption = {
  value: string;
  label: string;
};

export function resolveCanonicalPricingProviderForRuntime(
  providerType: RuntimeProviderType
): CanonicalPricingProvider | null {
  if (providerType === "codex" || providerType === "cursor" || providerType === "openai_api") {
    return "openai_api";
  }
  if (providerType === "claude_code" || providerType === "anthropic_api") {
    return "anthropic_api";
  }
  if (providerType === "opencode") {
    return "opencode";
  }
  return null;
}

export function getRegistryModelValuesForRuntimeProvider(
  rows: ModelRegistryRow[],
  providerType: RuntimeProviderType
) {
  const canonical = resolveCanonicalPricingProviderForRuntime(providerType);
  if (!canonical) {
    return [];
  }
  return rows
    .filter((row) => row.providerType === canonical)
    .map((row) => row.modelId.trim())
    .filter((value) => value.length > 0);
}

export function buildRegistryModelOptions(input: {
  rows: ModelRegistryRow[];
  providerType: RuntimeProviderType;
  currentModel?: string | null;
  includeDefault?: boolean;
}) {
  const values = getRegistryModelValuesForRuntimeProvider(input.rows, input.providerType);
  const options: ModelOption[] = [];
  if (input.includeDefault) {
    options.push({ value: "", label: "Default" });
  }
  const labelByModelId = new Map<string, string>();
  const canonical = resolveCanonicalPricingProviderForRuntime(input.providerType);
  if (canonical) {
    for (const row of input.rows) {
      if (row.providerType !== canonical) {
        continue;
      }
      const modelId = row.modelId.trim();
      if (!modelId) {
        continue;
      }
      labelByModelId.set(modelId, row.displayName?.trim() || modelId);
    }
  }
  for (const modelId of Array.from(new Set(values)).sort()) {
    options.push({ value: modelId, label: labelByModelId.get(modelId) ?? modelId });
  }
  const currentModel = input.currentModel?.trim();
  if (currentModel && !options.some((entry) => entry.value === currentModel)) {
    options.push({ value: currentModel, label: `${currentModel} (current)` });
  }
  return options;
}
