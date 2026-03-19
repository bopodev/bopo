import { createClassifier, normalizeWhitespace } from "./common";
import type { ProviderFailureNormalizer } from "./types";

const normalizeClaudeFailureDetail: ProviderFailureNormalizer = (detail) => {
  const normalized = normalizeWhitespace(detail);
  if (!normalized) return detail;
  const lower = normalized.toLowerCase();
  if (/model/.test(lower) && /(not supported|does not exist|not found|unavailable|unsupported)/.test(lower)) {
    return "Selected Anthropic model is unavailable for this account. Choose a supported model.";
  }
  if (/(auth|unauthorized|api key|invalid_api_key|permission denied|not logged in|claude login)/.test(lower)) {
    return "Authentication failed for provider runtime. Verify credentials and account access.";
  }
  return normalized;
};

export const claudeCodeFailureResolver = {
  normalize: normalizeClaudeFailureDetail,
  classify: createClassifier(normalizeClaudeFailureDetail)
};
