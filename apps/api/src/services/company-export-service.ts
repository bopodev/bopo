import type { BopoDb } from "bopodev-db";
import { getCompany, listAgents, listGoals, listIssues, listProjects } from "bopodev-db";

function serializeValue(value: unknown): unknown {
  if (value instanceof Date) {
    return value.toISOString();
  }
  if (value !== null && typeof value === "object" && !Array.isArray(value)) {
    return serializeRow(value as Record<string, unknown>);
  }
  if (Array.isArray(value)) {
    return value.map((entry) => serializeValue(entry));
  }
  return value;
}

function serializeRow<T extends Record<string, unknown>>(row: T): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [key, val] of Object.entries(row)) {
    out[key] = serializeValue(val);
  }
  return out;
}

/** Strip agent fields that commonly hold secrets or session state for shareable exports. */
function scrubAgentRow(agent: Record<string, unknown>) {
  const base = serializeRow(agent);
  return {
    ...base,
    runtimeEnvJson: "{}",
    bootstrapPrompt: null,
    stateBlob: "{}",
    runtimeCommand: null,
    runtimeArgsJson: "[]"
  };
}

/**
 * Portable company snapshot for backup, templates, or handoff (secrets and agent session state redacted).
 */
export async function buildCompanyPortabilityExport(db: BopoDb, companyId: string) {
  const company = await getCompany(db, companyId);
  if (!company) {
    return null;
  }

  const [projects, goals, issues, agents] = await Promise.all([
    listProjects(db, companyId),
    listGoals(db, companyId),
    listIssues(db, companyId),
    listAgents(db, companyId)
  ]);

  return {
    exportedAt: new Date().toISOString(),
    formatVersion: 1,
    company: serializeRow(company as unknown as Record<string, unknown>),
    projects: projects.map((p) => serializeRow(p as unknown as Record<string, unknown>)),
    goals: goals.map((g) => serializeRow(g as unknown as Record<string, unknown>)),
    issues: issues.map((issue) => serializeRow(issue as unknown as Record<string, unknown>)),
    agents: agents.map((agent) => scrubAgentRow(agent as unknown as Record<string, unknown>))
  };
}
