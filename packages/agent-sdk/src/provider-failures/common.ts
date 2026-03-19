import { containsUsageLimitHardStopFailure } from "../runtime-core";
import type {
  ProviderFailureClassification,
  ProviderFailureClassifier,
  ProviderFailureInput,
  ProviderFailureNormalizer
} from "./types";

export function normalizeWhitespace(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

export function hasModelUnsupportedSignal(haystack: string) {
  return (
    /model/.test(haystack) &&
    /(not supported|unsupported|does not exist|not found|unavailable|invalid model|model_not_found)/.test(haystack)
  );
}

export function hasAuthFailureSignal(haystack: string) {
  return /(not logged in|login required|requires login|authentication required|authentication failed|unauthorized|invalid[_\s-]?api[_\s-]?key|api key)/.test(
    haystack
  );
}

export function hasUnknownSessionSignal(haystack: string) {
  return /unknown session|session .* not found|could not resume|missing rollout path for thread|conversation .* not found|thread .* not found/.test(
    haystack
  );
}

export function classifyFromSignals(
  normalize: ProviderFailureNormalizer,
  input: ProviderFailureInput
): ProviderFailureClassification {
  const detail = normalize(input.detail);
  const combined = `${detail}\n${input.stderr ?? ""}\n${input.stdout ?? ""}`.toLowerCase();
  if (containsUsageLimitHardStopFailure(combined)) {
    const blockerCode =
      combined.includes("insufficient_quota") ||
      combined.includes("billing_hard_limit_reached") ||
      combined.includes("out of funds")
        ? "provider_out_of_funds"
        : "provider_quota_exhausted";
    return {
      detail,
      blockerCode,
      retryable: false,
      providerUsageLimited: true
    };
  }
  if (hasModelUnsupportedSignal(combined)) {
    return {
      detail,
      blockerCode: "model_not_supported",
      retryable: false,
      providerUsageLimited: false
    };
  }
  if (hasAuthFailureSignal(combined)) {
    return {
      detail,
      blockerCode: "auth_required",
      retryable: false,
      providerUsageLimited: false
    };
  }
  if (hasUnknownSessionSignal(combined)) {
    return {
      detail: "Saved provider session is no longer available. Retry with a fresh session.",
      blockerCode: "unknown_session",
      retryable: true,
      providerUsageLimited: false
    };
  }
  return {
    detail,
    blockerCode: input.failureType?.trim() || "runtime_failed",
    retryable: input.failureType !== "auth" && input.failureType !== "bad_response",
    providerUsageLimited: false
  };
}

export function createClassifier(normalize: ProviderFailureNormalizer): ProviderFailureClassifier {
  return (input) => classifyFromSignals(normalize, input);
}
