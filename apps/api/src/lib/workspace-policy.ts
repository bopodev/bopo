import { and, eq, inArray } from "drizzle-orm";
import type { BopoDb } from "bopodev-db";
import { projects } from "bopodev-db";
import {
  isInsidePath,
  normalizeAbsolutePath,
  resolveAgentFallbackWorkspacePath,
  resolveAgentMemoryRootPath,
  resolveCompanyProjectsWorkspacePath
} from "./instance-paths";

export function hasText(value: string | null | undefined) {
  return Boolean(value && value.trim().length > 0);
}

export function parseRuntimeCwd(stateBlob: string | null | undefined) {
  if (!stateBlob) {
    return null;
  }
  try {
    const parsed = JSON.parse(stateBlob) as { runtime?: { cwd?: unknown } };
    const cwd = parsed.runtime?.cwd;
    return typeof cwd === "string" ? cwd : null;
  } catch {
    return null;
  }
}

export async function inferSingleWorkspaceLocalPath(db: BopoDb, companyId: string) {
  const rows = await db
    .select({ workspaceLocalPath: projects.workspaceLocalPath })
    .from(projects)
    .where(eq(projects.companyId, companyId));
  const paths = Array.from(
    new Set(
      rows
        .map((row) => row.workspaceLocalPath?.trim() ?? "")
        .filter((value) => value.length > 0)
    )
  );
  const singlePath = paths.length === 1 ? paths[0] : null;
  return singlePath ? normalizeAbsolutePath(singlePath) : null;
}

export async function resolveDefaultRuntimeCwdForCompany(db: BopoDb, companyId: string) {
  const inferredSingleWorkspace = await inferSingleWorkspaceLocalPath(db, companyId);
  if (inferredSingleWorkspace) {
    return inferredSingleWorkspace;
  }
  return resolveCompanyProjectsWorkspacePath(companyId);
}

export async function getProjectWorkspaceMap(db: BopoDb, companyId: string, projectIds: string[]) {
  if (projectIds.length === 0) {
    return new Map<string, string | null>();
  }
  const rows = await db
    .select({ id: projects.id, workspaceLocalPath: projects.workspaceLocalPath })
    .from(projects)
    .where(and(eq(projects.companyId, companyId), inArray(projects.id, projectIds)));
  return new Map(rows.map((row) => [row.id, row.workspaceLocalPath ? normalizeAbsolutePath(row.workspaceLocalPath) : null]));
}

export function ensureRuntimeInsideWorkspace(projectWorkspacePath: string, runtimeCwd: string) {
  return isInsidePath(normalizeAbsolutePath(projectWorkspacePath), normalizeAbsolutePath(runtimeCwd));
}

export function ensureRuntimeWorkspaceCompatible(projectWorkspacePath: string, runtimeCwd: string) {
  const projectPath = normalizeAbsolutePath(projectWorkspacePath);
  const runtimePath = normalizeAbsolutePath(runtimeCwd);
  return isInsidePath(projectPath, runtimePath) || isInsidePath(runtimePath, projectPath);
}

export function resolveAgentFallbackWorkspace(companyId: string, agentId: string) {
  return resolveAgentFallbackWorkspacePath(companyId, agentId);
}

export function resolveAgentMemoryRoot(companyId: string, agentId: string) {
  return resolveAgentMemoryRootPath(companyId, agentId);
}
