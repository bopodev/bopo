import { createClassifier, normalizeWhitespace } from "./common";
import type { ProviderFailureNormalizer } from "./types";

const normalizeShellFailureDetail: ProviderFailureNormalizer = (detail) => {
  const normalized = normalizeWhitespace(detail);
  return normalized || detail;
};

export const shellFailureResolver = {
  normalize: normalizeShellFailureDetail,
  classify: createClassifier(normalizeShellFailureDetail)
};
