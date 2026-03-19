import { createClassifier, normalizeWhitespace } from "./common";
import type { ProviderFailureNormalizer } from "./types";

const normalizeHttpFailureDetail: ProviderFailureNormalizer = (detail) => {
  const normalized = normalizeWhitespace(detail);
  return normalized || detail;
};

export const httpFailureResolver = {
  normalize: normalizeHttpFailureDetail,
  classify: createClassifier(normalizeHttpFailureDetail)
};
