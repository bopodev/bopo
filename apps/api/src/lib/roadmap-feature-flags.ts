function envEnabled(key: string, defaultEnabled = true) {
  const raw = process.env[key];
  if (typeof raw !== "string") {
    return defaultEnabled;
  }
  return raw.trim() !== "0";
}

export function isVerifiedMemoryEnabled() {
  return envEnabled("BOPO_FEATURE_VERIFIED_MEMORY", true);
}

export function isQueueIntelligenceEnabled() {
  return envEnabled("BOPO_FEATURE_QUEUE_INTELLIGENCE", true);
}

export function isOrgLearningEnabled() {
  return envEnabled("BOPO_FEATURE_ORG_LEARNING", true);
}
