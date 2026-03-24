/**
 * Parse OpenClaw gateway JSON payloads for session usage (tokens, model, cost).
 * Shapes follow `sessions.list` / `sessions.usage` responses on the gateway WebSocket API.
 */

function asRecord(value: unknown): Record<string, unknown> | null {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return null;
  }
  return value as Record<string, unknown>;
}

function nonEmptyString(value: unknown): string | null {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
}

function finiteNonNegInt(value: unknown): number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return 0;
  }
  return Math.max(0, Math.floor(value));
}

function finiteNonNegNumber(value: unknown): number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return 0;
  }
  return Math.max(0, value);
}

export type ParsedOpenClawSessionUsage = {
  tokenInput: number;
  tokenOutput: number;
  cachedInputTokens: number;
  usdCost: number;
  model: string | null;
  modelProvider: string | null;
  source: "sessions.list" | "sessions.usage";
};

function hasAnySignal(parsed: ParsedOpenClawSessionUsage): boolean {
  return (
    parsed.tokenInput > 0 ||
    parsed.tokenOutput > 0 ||
    parsed.cachedInputTokens > 0 ||
    parsed.usdCost > 0 ||
    Boolean(parsed.model) ||
    Boolean(parsed.modelProvider)
  );
}

/** Match `GatewaySessionRow` from OpenClaw `sessions.list` (search + exact key). */
export function extractUsageFromSessionsList(
  payload: unknown,
  exactSessionKey: string
): ParsedOpenClawSessionUsage | null {
  const rec = asRecord(payload);
  if (!rec) {
    return null;
  }
  const sessions = Array.isArray(rec.sessions) ? rec.sessions : [];
  for (const row of sessions) {
    const r = asRecord(row);
    if (!r) {
      continue;
    }
    if (nonEmptyString(r.key) !== exactSessionKey) {
      continue;
    }
    const parsed: ParsedOpenClawSessionUsage = {
      tokenInput: finiteNonNegInt(r.inputTokens),
      tokenOutput: finiteNonNegInt(r.outputTokens),
      cachedInputTokens: 0,
      usdCost: finiteNonNegNumber(r.estimatedCostUsd),
      model: nonEmptyString(r.model),
      modelProvider: nonEmptyString(r.modelProvider),
      source: "sessions.list"
    };
    return hasAnySignal(parsed) ? parsed : null;
  }
  return null;
}

/** Match `SessionUsageEntry` from OpenClaw `sessions.usage` when `key` is scoped. */
export function extractUsageFromSessionsUsage(
  payload: unknown,
  exactSessionKey: string
): ParsedOpenClawSessionUsage | null {
  const rec = asRecord(payload);
  if (!rec) {
    return null;
  }
  const sessions = Array.isArray(rec.sessions) ? rec.sessions : [];
  for (const row of sessions) {
    const r = asRecord(row);
    if (!r) {
      continue;
    }
    if (nonEmptyString(r.key) !== exactSessionKey) {
      continue;
    }
    const usage = asRecord(r.usage);
    const parsed: ParsedOpenClawSessionUsage = {
      tokenInput: usage ? finiteNonNegNumber(usage.input) : 0,
      tokenOutput: usage ? finiteNonNegNumber(usage.output) : 0,
      cachedInputTokens: usage ? finiteNonNegNumber(usage.cacheRead) : 0,
      usdCost: usage ? finiteNonNegNumber(usage.totalCost) : 0,
      model: nonEmptyString(r.model),
      modelProvider: nonEmptyString(r.modelProvider),
      source: "sessions.usage"
    };
    return hasAnySignal(parsed) ? parsed : null;
  }
  return null;
}

/**
 * Map OpenClaw session `modelProvider` strings to Bopo `pricingProviderType` when catalog pricing should apply.
 * Returns `null` when unknown so heartbeat cost logic falls back to gateway-reported USD or `openclaw_gateway` defaults.
 */
export function mapOpenClawModelProviderToBopoPricingType(
  openclawProvider: string | null | undefined
): string | null {
  const raw = openclawProvider?.trim().toLowerCase() ?? "";
  if (!raw) {
    return null;
  }
  if (raw.includes("anthropic")) {
    return "anthropic_api";
  }
  if (raw.includes("openai")) {
    return "openai_api";
  }
  if (raw.includes("google") || raw.includes("gemini")) {
    return "gemini_cli";
  }
  return null;
}
