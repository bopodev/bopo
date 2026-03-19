import { createClassifier, normalizeWhitespace } from "./common";
import type { ProviderFailureNormalizer } from "./types";

const normalizeCodexFailureDetail: ProviderFailureNormalizer = (detail) => {
  const normalized = normalizeWhitespace(detail);
  if (!normalized) return detail;
  const lower = normalized.toLowerCase();
  if (/not supported/.test(lower) && lower.includes("chatgpt account") && lower.includes("model")) {
    return "Codex model not supported for this ChatGPT account. Select a supported Codex model.";
  }
  if (/model/.test(lower) && /(not supported|does not exist|not found|unavailable|unsupported)/.test(lower)) {
    return "Selected model is unavailable for this account. Choose a supported model.";
  }
  if (/(auth|unauthorized|api key|invalid_api_key|permission denied)/.test(lower)) {
    return "Authentication failed for provider runtime. Verify credentials and account access.";
  }
  return normalized;
};

export const codexFailureResolver = {
  normalize: normalizeCodexFailureDetail,
  classify: createClassifier(normalizeCodexFailureDetail)
};
