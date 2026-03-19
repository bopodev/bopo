import { createClassifier, normalizeWhitespace } from "./common";
import type { ProviderFailureNormalizer } from "./types";

const normalizeGeminiFailureDetail: ProviderFailureNormalizer = (detail) => {
  const normalized = normalizeWhitespace(detail);
  if (!normalized) return detail;
  const lower = normalized.toLowerCase();
  if (/model/.test(lower) && /(not supported|does not exist|not found|unavailable|unsupported)/.test(lower)) {
    return "Selected model is unavailable for this account. Choose a supported model.";
  }
  if (/(auth|unauthorized|api key|permission denied)/.test(lower)) {
    return "Gemini authentication failed. Verify Gemini credentials and account permissions.";
  }
  return normalized;
};

export const geminiCliFailureResolver = {
  normalize: normalizeGeminiFailureDetail,
  classify: createClassifier(normalizeGeminiFailureDetail)
};
