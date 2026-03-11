import { Router } from "express";
import { mkdir } from "node:fs/promises";
import { z } from "zod";
import { appendAuditEvent, createProject, deleteProject, listProjects, syncProjectGoals, updateProject } from "bopodev-db";
import type { AppContext } from "../context";
import { sendError, sendOk } from "../http";
import { normalizeAbsolutePath, resolveProjectWorkspacePath } from "../lib/instance-paths";
import { requireCompanyScope } from "../middleware/company-scope";
import { requirePermission } from "../middleware/request-actor";

const projectStatusSchema = z.enum(["planned", "active", "paused", "blocked", "completed", "archived"]);

const createProjectSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  status: projectStatusSchema.default("planned"),
  plannedStartAt: z.string().optional(),
  workspaceLocalPath: z.string().optional(),
  workspaceGithubRepo: z.string().url().optional(),
  goalIds: z.array(z.string().min(1)).default([])
});

const updateProjectSchema = z
  .object({
    name: z.string().min(1).optional(),
    description: z.string().nullable().optional(),
    status: projectStatusSchema.optional(),
    plannedStartAt: z.string().nullable().optional(),
    workspaceLocalPath: z.string().nullable().optional(),
    workspaceGithubRepo: z.string().url().nullable().optional(),
    goalIds: z.array(z.string().min(1)).optional()
  })
  .refine((payload) => Object.keys(payload).length > 0, "At least one field must be provided.");

function parsePlannedStartAt(value?: string | null) {
  if (!value) {
    return null;
  }
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    throw new Error("Invalid plannedStartAt value.");
  }
  return parsed;
}

export function createProjectsRouter(ctx: AppContext) {
  const router = Router();
  router.use(requireCompanyScope);

  router.get("/", async (req, res) => {
    const projects = await listProjects(ctx.db, req.companyId!);
    return sendOk(res, projects);
  });

  router.post("/", async (req, res) => {
    requirePermission("projects:write")(req, res, () => {});
    if (res.headersSent) {
      return;
    }
    const parsed = createProjectSchema.safeParse(req.body);
    if (!parsed.success) {
      return sendError(res, parsed.error.message, 422);
    }
    const explicitWorkspaceLocalPath = normalizeOptionalPath(parsed.data.workspaceLocalPath);
    const created = await createProject(ctx.db, {
      companyId: req.companyId!,
      name: parsed.data.name,
      description: parsed.data.description,
      status: parsed.data.status,
      plannedStartAt: parsePlannedStartAt(parsed.data.plannedStartAt),
      workspaceLocalPath: explicitWorkspaceLocalPath ?? undefined,
      workspaceGithubRepo: parsed.data.workspaceGithubRepo
    });
    const project =
      explicitWorkspaceLocalPath
        ? created
        : await ensureAutoWorkspaceLocalPath(ctx, req.companyId!, created.id);
    if (explicitWorkspaceLocalPath) {
      await mkdir(explicitWorkspaceLocalPath, { recursive: true });
    }
    await syncProjectGoals(ctx.db, {
      companyId: req.companyId!,
      projectId: project.id,
      goalIds: parsed.data.goalIds
    });
    await appendAuditEvent(ctx.db, {
      companyId: req.companyId!,
      actorType: "human",
      eventType: "project.created",
      entityType: "project",
      entityId: project.id,
      payload: project
    });
    return sendOk(res, project);
  });

  router.put("/:projectId", async (req, res) => {
    requirePermission("projects:write")(req, res, () => {});
    if (res.headersSent) {
      return;
    }
    const parsed = updateProjectSchema.safeParse(req.body);
    if (!parsed.success) {
      return sendError(res, parsed.error.message, 422);
    }

    const project = await updateProject(ctx.db, {
      companyId: req.companyId!,
      id: req.params.projectId,
      name: parsed.data.name,
      description: parsed.data.description,
      status: parsed.data.status,
      plannedStartAt:
        parsed.data.plannedStartAt === undefined ? undefined : parsePlannedStartAt(parsed.data.plannedStartAt),
      workspaceLocalPath:
        parsed.data.workspaceLocalPath === undefined
          ? undefined
          : parsed.data.workspaceLocalPath === null
            ? null
            : normalizeAbsolutePath(parsed.data.workspaceLocalPath),
      workspaceGithubRepo: parsed.data.workspaceGithubRepo
    });
    if (
      parsed.data.workspaceLocalPath !== undefined &&
      parsed.data.workspaceLocalPath !== null &&
      parsed.data.workspaceLocalPath.trim().length > 0
    ) {
      await mkdir(normalizeAbsolutePath(parsed.data.workspaceLocalPath), { recursive: true });
    }
    if (!project) {
      return sendError(res, "Project not found.", 404);
    }
    if (parsed.data.workspaceLocalPath === null) {
      const autoWorkspacePath = resolveProjectWorkspacePath(req.companyId!, project.id);
      await mkdir(autoWorkspacePath, { recursive: true });
      const updated = await updateProject(ctx.db, {
        companyId: req.companyId!,
        id: req.params.projectId,
        workspaceLocalPath: autoWorkspacePath
      });
      if (!updated) {
        return sendError(res, "Project not found.", 404);
      }
      Object.assign(project, updated);
    }

    if (parsed.data.goalIds) {
      await syncProjectGoals(ctx.db, {
        companyId: req.companyId!,
        projectId: project.id,
        goalIds: parsed.data.goalIds
      });
    }

    await appendAuditEvent(ctx.db, {
      companyId: req.companyId!,
      actorType: "human",
      eventType: "project.updated",
      entityType: "project",
      entityId: project.id,
      payload: project
    });
    return sendOk(res, project);
  });

  router.delete("/:projectId", async (req, res) => {
    requirePermission("projects:write")(req, res, () => {});
    if (res.headersSent) {
      return;
    }
    const deleted = await deleteProject(ctx.db, req.companyId!, req.params.projectId);
    if (!deleted) {
      return sendError(res, "Project not found.", 404);
    }

    await appendAuditEvent(ctx.db, {
      companyId: req.companyId!,
      actorType: "human",
      eventType: "project.deleted",
      entityType: "project",
      entityId: req.params.projectId,
      payload: { id: req.params.projectId }
    });
    return sendOk(res, { deleted: true });
  });

  return router;
}

async function ensureAutoWorkspaceLocalPath(ctx: AppContext, companyId: string, projectId: string) {
  const workspaceLocalPath = resolveProjectWorkspacePath(companyId, projectId);
  await mkdir(workspaceLocalPath, { recursive: true });
  const updated = await updateProject(ctx.db, {
    companyId,
    id: projectId,
    workspaceLocalPath
  });
  if (!updated) {
    throw new Error("Project not found after creation.");
  }
  return updated;
}

function normalizeOptionalPath(value: string | undefined) {
  if (!value || value.trim().length === 0) {
    return null;
  }
  return normalizeAbsolutePath(value);
}
