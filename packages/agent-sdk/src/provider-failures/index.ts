import type { AgentProviderType } from "../types";
import { anthropicApiFailureResolver } from "./anthropic-api";
import { claudeCodeFailureResolver } from "./claude-code";
import { codexFailureResolver } from "./codex";
import { cursorFailureResolver } from "./cursor";
import { geminiCliFailureResolver } from "./gemini-cli";
import { httpFailureResolver } from "./http";
import { openAiApiFailureResolver } from "./openai-api";
import { opencodeFailureResolver } from "./opencode";
import { shellFailureResolver } from "./shell";
import type {
  ProviderFailureClassification,
  ProviderFailureInput,
  ProviderFailureResolverMap
} from "./types";

const providerFailureResolvers: ProviderFailureResolverMap = {
  codex: codexFailureResolver,
  claude_code: claudeCodeFailureResolver,
  openai_api: openAiApiFailureResolver,
  anthropic_api: anthropicApiFailureResolver,
  cursor: cursorFailureResolver,
  opencode: opencodeFailureResolver,
  gemini_cli: geminiCliFailureResolver,
  shell: shellFailureResolver,
  http: httpFailureResolver
};

export function normalizeProviderFailureDetail(provider: AgentProviderType, detail: string) {
  const resolver = providerFailureResolvers[provider];
  if (!resolver) {
    return detail.replace(/\s+/g, " ").trim() || detail;
  }
  return resolver.normalize(detail);
}

export function classifyProviderFailure(
  provider: AgentProviderType,
  input: ProviderFailureInput
): ProviderFailureClassification {
  const resolver = providerFailureResolvers[provider];
  if (!resolver) {
    const normalized = input.detail.replace(/\s+/g, " ").trim() || input.detail;
    return {
      detail: normalized,
      blockerCode: input.failureType?.trim() || "runtime_failed",
      retryable: input.failureType !== "auth" && input.failureType !== "bad_response",
      providerUsageLimited: false
    };
  }
  return resolver.classify(input);
}

export type { ProviderFailureClassification, ProviderFailureInput } from "./types";
