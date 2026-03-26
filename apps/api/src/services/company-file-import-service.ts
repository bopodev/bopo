import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { unzipSync } from "fflate";
import { parse as yamlParse } from "yaml";
import { z } from "zod";
import type { BopoDb } from "bopodev-db";
import { createAgent, createCompany, createProject } from "bopodev-db";
import { normalizeRuntimeConfig, runtimeConfigToDb, runtimeConfigToStateBlobPatch } from "../lib/agent-config";
import {
  resolveAgentMemoryRootPath,
  resolveAgentOperatingPath,
  resolveCompanyProjectsWorkspacePath
} from "../lib/instance-paths";
import { resolveDefaultRuntimeCwdForCompany } from "../lib/workspace-policy";
import { ensureBuiltinPluginsRegistered } from "./plugin-runtime";
import { ensureCompanyBuiltinTemplateDefaults } from "./template-catalog";
import { addWorkLoopTrigger, createWorkLoop } from "./work-loop-service/work-loop-service";

const EXPORT_SCHEMA = "bopo/company-export/v1";

const BopoExportYamlSchema = z.object({
  schema: z.string(),
  company: z.object({
    name: z.string().min(1),
    mission: z.string().nullable().optional(),
    slug: z.string().optional()
  }),
  projects: z.record(z.string(), z.object({ name: z.string().min(1), description: z.string().nullable().optional(), status: z.string().optional() })),
  agents: z.record(
    z.string(),
    z.object({
      name: z.string().min(1),
      role: z.string().min(1),
      roleKey: z.string().nullable().optional(),
      title: z.string().nullable().optional(),
      capabilities: z.string().nullable().optional(),
      managerSlug: z.string().nullable().optional(),
      providerType: z.string().min(1),
      heartbeatCron: z.string().min(1),
      canHireAgents: z.boolean().optional()
    })
  ),
  routines: z
    .record(
      z.string(),
      z.object({
        title: z.string().min(1),
        description: z.string().nullable().optional(),
        projectSlug: z.string().min(1),
        assigneeAgentSlug: z.string().min(1),
        triggers: z
          .array(
            z.object({
              cronExpression: z.string().min(1),
              timezone: z.string().optional(),
              label: z.string().nullable().optional()
            })
          )
          .min(1)
      })
    )
    .optional()
});

export class CompanyFileImportError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CompanyFileImportError";
  }
}

function normalizeZipPath(key: string): string | null {
  const t = key.replace(/\\/g, "/").replace(/^\/+/, "");
  if (!t || t.includes("..")) {
    return null;
  }
  return t;
}

function decodeZipEntries(buffer: Buffer): Record<string, string> {
  let raw: Record<string, Uint8Array>;
  try {
    raw = unzipSync(new Uint8Array(buffer));
  } catch {
    throw new CompanyFileImportError("Archive is not a valid zip file.");
  }
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(raw)) {
    const path = normalizeZipPath(k);
    if (!path || path.endsWith("/")) {
      continue;
    }
    try {
      out[path] = new TextDecoder("utf8", { fatal: false }).decode(v);
    } catch {
      /* skip binary */
    }
  }
  return out;
}

const PROVIDER_TYPES = new Set([
  "claude_code",
  "codex",
  "cursor",
  "opencode",
  "gemini_cli",
  "openai_api",
  "anthropic_api",
  "openclaw_gateway",
  "http",
  "shell"
]);

type AgentProvider = NonNullable<Parameters<typeof createAgent>[1]["providerType"]>;

function coerceProviderType(raw: string): AgentProvider {
  return PROVIDER_TYPES.has(raw) ? (raw as AgentProvider) : "shell";
}

export async function importCompanyFromZipBuffer(db: BopoDb, buffer: Buffer): Promise<{ companyId: string; name: string }> {
  const entries = decodeZipEntries(buffer);
  const yamlText = entries[".bopo.yaml"] ?? entries["bopo.yaml"];
  if (!yamlText?.trim()) {
    throw new CompanyFileImportError('Zip must contain a ".bopo.yaml" manifest at the archive root.');
  }
  let parsedYaml: unknown;
  try {
    parsedYaml = yamlParse(yamlText);
  } catch {
    throw new CompanyFileImportError(".bopo.yaml is not valid YAML.");
  }
  const parsed = BopoExportYamlSchema.safeParse(parsedYaml);
  if (!parsed.success) {
    throw new CompanyFileImportError(`Invalid export manifest: ${parsed.error.message}`);
  }
  const doc = parsed.data;
  if (doc.schema !== EXPORT_SCHEMA) {
    throw new CompanyFileImportError(`Unsupported export schema '${doc.schema}' (expected ${EXPORT_SCHEMA}).`);
  }

  const created = await createCompany(db, {
    name: doc.company.name,
    mission: doc.company.mission ?? null
  });
  const companyId = created.id;
  const cwd = await resolveDefaultRuntimeCwdForCompany(db, companyId);
  await mkdir(cwd, { recursive: true });
  await ensureBuiltinPluginsRegistered(db, [companyId]);
  await ensureCompanyBuiltinTemplateDefaults(db, companyId);

  const projectSlugToId = new Map<string, string>();
  const projectStatuses = new Set(["planned", "active", "paused", "blocked", "completed", "archived"]);
  for (const [, p] of Object.entries(doc.projects)) {
    const st = p.status?.trim();
    const status = st && projectStatuses.has(st) ? (st as "planned") : "planned";
    const row = await createProject(db, {
      companyId,
      name: p.name,
      description: p.description ?? null,
      status
    });
    if (row) {
      projectSlugToId.set(slug, row.id);
    }
  }

  const agentSlugToId = new Map<string, string>();
  const agentEntries = Object.entries(doc.agents);
  const pending = new Map(agentEntries);
  let guard = 0;
  while (pending.size > 0 && guard < 500) {
    guard += 1;
    let progressed = false;
    for (const [slug, a] of [...pending.entries()]) {
      const mgrSlug = a.managerSlug?.trim() || null;
      let managerId: string | null = null;
      if (mgrSlug) {
        managerId = agentSlugToId.get(mgrSlug) ?? null;
        if (!managerId) {
          continue;
        }
      }
      const defaultRt = normalizeRuntimeConfig({
        defaultRuntimeCwd: cwd,
        runtimeConfig: { runtimeModel: undefined, runtimeEnv: {} }
      });
      const createdAgent = await createAgent(db, {
        companyId,
        managerAgentId: managerId,
        role: a.role,
        roleKey: a.roleKey?.trim() || null,
        title: a.title?.trim() || null,
        capabilities: a.capabilities?.trim() || null,
        name: a.name,
        providerType: coerceProviderType(a.providerType),
        heartbeatCron: a.heartbeatCron,
        monthlyBudgetUsd: "100.0000",
        canHireAgents: a.canHireAgents ?? false,
        ...runtimeConfigToDb(defaultRt),
        initialState: runtimeConfigToStateBlobPatch(defaultRt)
      });
      agentSlugToId.set(slug, createdAgent.id);
      pending.delete(slug);
      progressed = true;
    }
    if (!progressed) {
      throw new CompanyFileImportError("Could not resolve agent manager chain (circular or missing manager slug).");
    }
  }

  const companyRoot = resolveCompanyProjectsWorkspacePath(companyId);
  for (const [path, text] of Object.entries(entries)) {
    if (path === ".bopo.yaml" || path === "bopo.yaml" || path === "COMPANY.md" || path === "README.md") {
      continue;
    }
    if (path.startsWith("projects/") && path.endsWith("/PROJECT.md")) {
      continue;
    }
    if (path.startsWith("tasks/") && path.endsWith("/TASK.md")) {
      continue;
    }
    if (path.startsWith("agents/")) {
      const parts = path.split("/").filter(Boolean);
      if (parts.length < 3) {
        continue;
      }
      const agentSlug = parts[1]!;
      const agentId = agentSlugToId.get(agentSlug);
      if (!agentId) {
        continue;
      }
      const rest = parts.slice(2).join("/");
      const isMemory = rest.startsWith("memory/");
      const relativePath = isMemory ? rest.slice("memory/".length) : rest;
      const base = isMemory ? resolveAgentMemoryRootPath(companyId, agentId) : resolveAgentOperatingPath(companyId, agentId);
      const dest = join(base, relativePath);
      await mkdir(dirname(dest), { recursive: true });
      await writeFile(dest, text, "utf8");
      continue;
    }
    if (path.startsWith("skills/")) {
      const dest = join(companyRoot, path);
      await mkdir(dirname(dest), { recursive: true });
      await writeFile(dest, text, "utf8");
    }
  }

  const routines = doc.routines ?? {};
  for (const [, r] of Object.entries(routines)) {
    const projectId = projectSlugToId.get(r.projectSlug);
    const assigneeId = agentSlugToId.get(r.assigneeAgentSlug);
    if (!projectId || !assigneeId) {
      continue;
    }
    const loop = await createWorkLoop(db, {
      companyId,
      projectId,
      title: r.title,
      description: r.description?.trim() || null,
      assigneeAgentId: assigneeId
    });
    if (!loop) {
      continue;
    }
    for (const t of r.triggers) {
      await addWorkLoopTrigger(db, {
        companyId,
        workLoopId: loop.id,
        cronExpression: t.cronExpression,
        timezone: t.timezone?.trim() || "UTC",
        label: t.label ?? null,
        enabled: true
      });
    }
  }

  return { companyId, name: doc.company.name };
}
