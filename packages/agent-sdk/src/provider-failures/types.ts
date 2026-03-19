import type { AgentProviderType } from "../types";

export type ProviderFailureInput = {
  detail: string;
  stderr?: string;
  stdout?: string;
  failureType?: string | null;
};

export type ProviderFailureClassification = {
  detail: string;
  blockerCode: string;
  retryable: boolean;
  providerUsageLimited: boolean;
};

export type ProviderFailureClassifier = (
  input: ProviderFailureInput
) => ProviderFailureClassification;

export type ProviderFailureNormalizer = (detail: string) => string;

export type ProviderFailureResolver = {
  normalize: ProviderFailureNormalizer;
  classify: ProviderFailureClassifier;
};

export type ProviderFailureResolverMap = Partial<Record<AgentProviderType, ProviderFailureResolver>>;
