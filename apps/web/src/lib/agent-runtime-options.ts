type ProviderType =
  | "claude_code"
  | "codex"
  | "cursor"
  | "opencode"
  | "openai_api"
  | "anthropic_api"
  | "http"
  | "shell";

type ModelOption = {
  value: string;
  label: string;
};

const DEFAULT_MODEL_VALUE = "";
const defaultModelOption: ModelOption = { value: DEFAULT_MODEL_VALUE, label: "Default" };

const providerModelCatalog: Record<ProviderType, ModelOption[]> = {
  codex: [
    { value: "gpt-5.3-codex", label: "GPT-5.3 Codex" },
    { value: "gpt-5.3-codex-spark", label: "GPT-5.3 Codex Spark" },
    { value: "gpt-5", label: "GPT-5" },
    { value: "o3", label: "o3" },
    { value: "o4-mini", label: "o4-mini" },
    { value: "gpt-5-mini", label: "GPT-5 Mini" },
    { value: "gpt-5-nano", label: "GPT-5 Nano" },
    { value: "o3-mini", label: "o3-mini" },
    { value: "codex-mini-latest", label: "Codex Mini" }
  ],
  claude_code: [
    { value: "claude-opus-4-6", label: "Claude Opus 4.6" },
    { value: "claude-sonnet-4-5-20250929", label: "Claude Sonnet 4.5" },
    { value: "claude-haiku-4-5-20251001", label: "Claude Haiku 4.5" }
  ],
  cursor: [
    { value: "auto", label: "Auto" },
    { value: "gpt-5.3-codex", label: "gpt-5.3-codex" },
    { value: "gpt-5.3-codex-fast", label: "gpt-5.3-codex-fast" },
    { value: "sonnet-4.5", label: "sonnet-4.5" },
    { value: "opus-4.6", label: "opus-4.6" }
  ],
  openai_api: [
    { value: "gpt-5", label: "GPT-5" },
    { value: "gpt-5-mini", label: "GPT-5 Mini" },
    { value: "gpt-5-nano", label: "GPT-5 Nano" },
    { value: "o3", label: "o3" },
    { value: "o4-mini", label: "o4-mini" }
  ],
  anthropic_api: [
    { value: "claude-opus-4-6", label: "Claude Opus 4.6" },
    { value: "claude-sonnet-4-5-20250929", label: "Claude Sonnet 4.5" },
    { value: "claude-haiku-4-5-20251001", label: "Claude Haiku 4.5" }
  ],
  opencode: [],
  http: [],
  shell: []
};

export function getSupportedModelOptionsForProvider(providerType: ProviderType) {
  return [defaultModelOption, ...providerModelCatalog[providerType]];
}

export function getModelOptionsForProvider(providerType: ProviderType, currentModel?: string | null) {
  const baseOptions = getSupportedModelOptionsForProvider(providerType);
  const normalizedCurrentModel = currentModel?.trim();
  if (!normalizedCurrentModel) {
    return baseOptions;
  }
  if (baseOptions.some((option) => option.value === normalizedCurrentModel)) {
    return baseOptions;
  }
  return [...baseOptions, { value: normalizedCurrentModel, label: `${normalizedCurrentModel} (current)` }];
}

export function heartbeatCronToIntervalSec(cronExpression: string | undefined, fallbackSeconds = 300) {
  if (!cronExpression) {
    return fallbackSeconds;
  }
  const normalized = cronExpression.trim();
  if (normalized === "* * * * *") {
    return 60;
  }
  const stepMatch = normalized.match(/^\*\/(\d+)\s+\*\s+\*\s+\*\s+\*$/);
  if (stepMatch) {
    const minutes = Number(stepMatch[1]);
    if (Number.isInteger(minutes) && minutes > 0) {
      return minutes * 60;
    }
  }
  const fixedMinuteMatch = normalized.match(/^\d+\s+\*\s+\*\s+\*\s+\*$/);
  if (fixedMinuteMatch) {
    return 3600;
  }
  return fallbackSeconds;
}

export function heartbeatIntervalSecToCron(value: number) {
  const safeSeconds = Number.isFinite(value) ? Math.max(60, Math.floor(value)) : 60;
  const intervalMinutes = Math.max(1, Math.ceil(safeSeconds / 60));
  return intervalMinutes === 1 ? "* * * * *" : `*/${intervalMinutes} * * * *`;
}
