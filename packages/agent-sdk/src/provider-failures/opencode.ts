import { createClassifier, normalizeWhitespace } from "./common";
import type { ProviderFailureNormalizer } from "./types";

const normalizeOpenCodeFailureDetail: ProviderFailureNormalizer = (detail) => {
  const normalized = normalizeWhitespace(detail);
  if (!normalized) return detail;
  const lower = normalized.toLowerCase();
  if (/model/.test(lower) && /(not supported|does not exist|not found|unavailable|unsupported)/.test(lower)) {
    return "Selected model is unavailable for this account. Choose a supported model.";
  }
  if (/(auth|unauthorized|api key|invalid_api_key|permission denied)/.test(lower)) {
    return "Authentication failed for provider runtime. Verify credentials and account access.";
  }
  return normalized;
};

export const opencodeFailureResolver = {
  normalize: normalizeOpenCodeFailureDetail,
  classify: createClassifier(normalizeOpenCodeFailureDetail)
};
