import { mkdir } from "node:fs/promises";
import type { NextFunction, Request, Response } from "express";
import { Router } from "express";
import multer from "multer";
import { z } from "zod";
import { CompanySchema } from "bopodev-contracts";
import { createAgent, createCompany, deleteCompany, listCompanies, updateCompany } from "bopodev-db";
import type { AppContext } from "../context";
import { sendError, sendOk, sendOkValidated } from "../http";
import { normalizeRuntimeConfig, resolveRuntimeModelForProvider, runtimeConfigToDb, runtimeConfigToStateBlobPatch } from "../lib/agent-config";
import { buildDefaultCeoBootstrapPrompt } from "../lib/ceo-bootstrap-prompt";
import { resolveOpencodeRuntimeModel } from "../lib/opencode-model";
import { resolveDefaultRuntimeCwdForCompany } from "../lib/workspace-policy";
import { canAccessCompany, requireBoardRole, requirePermission } from "../middleware/request-actor";
import {
  CompanyFileArchiveError,
  listCompanyExportManifest,
  normalizeExportPath,
  pipeCompanyExportZip,
  readCompanyExportFileText
} from "../services/company-file-archive-service";
import { buildCompanyPortabilityExport } from "../services/company-export-service";
import { CompanyFileImportError, importCompanyFromZipBuffer } from "../services/company-file-import-service";
import { ensureCompanyBuiltinPluginDefaults } from "../services/plugin-runtime";
import { ensureCompanyBuiltinTemplateDefaults } from "../services/template-catalog";

const zipUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 80 * 1024 * 1024 }
});

const exportZipBodySchema = z.object({
  paths: z.array(z.string()).nullable().optional(),
  includeAgentMemory: z.boolean().optional().default(false)
});

const DEFAULT_AGENT_PROVIDER_ENV = "BOPO_DEFAULT_AGENT_PROVIDER";
const DEFAULT_AGENT_MODEL_ENV = "BOPO_DEFAULT_AGENT_MODEL";

const createCompanySchema = z.object({
  name: z.string().min(1),
  mission: z.string().optional(),
  providerType: z
    .enum(["codex", "claude_code", "cursor", "gemini_cli", "opencode", "openai_api", "anthropic_api", "http", "shell"])
    .optional(),
  runtimeModel: z.string().optional()
});

const updateCompanySchema = z
  .object({
    name: z.string().min(1).optional(),
    mission: z.string().optional()
  })
  .refine((payload) => Object.keys(payload).length > 0, "At least one field must be provided.");

export function createCompaniesRouter(ctx: AppContext) {
  const router = Router();

  router.get("/", async (req, res) => {
    const companies = (await listCompanies(ctx.db)).map((company) => ({
      ...company,
      createdAt: company.createdAt instanceof Date ? company.createdAt.toISOString() : String(company.createdAt)
    }));
    if (req.actor?.type === "board") {
      return sendOkValidated(res, CompanySchema.array(), companies, "companies.list");
    }
    const visibleCompanyIds = new Set(req.actor?.companyIds ?? []);
    return sendOkValidated(
      res,
      CompanySchema.array(),
      companies.filter((company) => visibleCompanyIds.has(company.id)),
      "companies.list.filtered"
    );
  });

  router.post("/import/files", requireBoardRole, zipUpload.single("archive"), async (req, res) => {
    const file = req.file;
    if (!file?.buffer) {
      return sendError(res, 'Upload a .zip file in field "archive".', 422);
    }
    try {
      const result = await importCompanyFromZipBuffer(ctx.db, file.buffer);
      return sendOk(res, result);
    } catch (err) {
      const message = err instanceof CompanyFileImportError ? err.message : String(err);
      return sendError(res, message, 422);
    }
  });

  router.get("/:companyId/export/files/manifest", async (req, res) => {
    const companyId = readCompanyIdParam(req);
    if (!companyId) {
      return sendError(res, "Missing company id.", 422);
    }
    if (!canAccessCompany(req, companyId)) {
      return sendError(res, "Actor does not have access to this company.", 403);
    }
    const includeAgentMemory = req.query.includeAgentMemory === "1" || req.query.includeAgentMemory === "true";
    try {
      const files = await listCompanyExportManifest(ctx.db, companyId, { includeAgentMemory });
      return sendOk(res, { files, includeAgentMemory });
    } catch (err) {
      const message = err instanceof CompanyFileArchiveError ? err.message : String(err);
      return sendError(res, message, 422);
    }
  });

  router.get("/:companyId/export/files/preview", async (req, res) => {
    const companyId = readCompanyIdParam(req);
    if (!companyId) {
      return sendError(res, "Missing company id.", 422);
    }
    if (!canAccessCompany(req, companyId)) {
      return sendError(res, "Actor does not have access to this company.", 403);
    }
    const pathRaw = typeof req.query.path === "string" ? req.query.path : "";
    const includeAgentMemory = req.query.includeAgentMemory === "1" || req.query.includeAgentMemory === "true";
    const normalizedPath = normalizeExportPath(pathRaw);
    if (!normalizedPath) {
      return sendError(res, "Invalid or missing path query parameter.", 422);
    }
    try {
      const preview = await readCompanyExportFileText(ctx.db, companyId, normalizedPath, { includeAgentMemory });
      if (!preview) {
        return sendError(res, "File not found in export manifest.", 404);
      }
      res.setHeader("content-type", "text/plain; charset=utf-8");
      return res.status(200).send(preview.content);
    } catch (err) {
      const message = err instanceof CompanyFileArchiveError ? err.message : String(err);
      return sendError(res, message, 422);
    }
  });

  router.post("/:companyId/export/files/zip", async (req, res) => {
    const companyId = readCompanyIdParam(req);
    if (!companyId) {
      return sendError(res, "Missing company id.", 422);
    }
    if (!canAccessCompany(req, companyId)) {
      return sendError(res, "Actor does not have access to this company.", 403);
    }
    const parsed = exportZipBodySchema.safeParse(req.body ?? {});
    if (!parsed.success) {
      return sendError(res, parsed.error.message, 422);
    }
    try {
      const stream = await pipeCompanyExportZip(ctx.db, companyId, {
        paths: parsed.data.paths ?? null,
        includeAgentMemory: parsed.data.includeAgentMemory
      });
      res.setHeader("Content-Type", "application/zip");
      res.setHeader("Content-Disposition", `attachment; filename="company-${companyId}-export.zip"`);
      stream.on("error", () => {
        if (!res.headersSent) {
          sendError(res, "Zip stream failed.", 500);
        } else {
          res.end();
        }
      });
      stream.pipe(res);
    } catch (err) {
      const message = err instanceof CompanyFileArchiveError ? err.message : String(err);
      return sendError(res, message, 422);
    }
  });

  router.get("/:companyId/export", async (req, res) => {
    const companyId = readCompanyIdParam(req);
    if (!companyId) {
      return sendError(res, "Missing company id.", 422);
    }
    if (!canAccessCompany(req, companyId)) {
      return sendError(res, "Actor does not have access to this company.", 403);
    }
    const payload = await buildCompanyPortabilityExport(ctx.db, companyId);
    if (!payload) {
      return sendError(res, "Company not found.", 404);
    }
    return sendOk(res, payload);
  });

  router.post("/", requireBoardRole, async (req, res) => {
    const parsed = createCompanySchema.safeParse(req.body);
    if (!parsed.success) {
      return sendError(res, parsed.error.message, 422);
    }
    const company = await createCompany(ctx.db, parsed.data);
    const providerType =
      parseAgentProvider(parsed.data.providerType) ??
      parseAgentProvider(process.env[DEFAULT_AGENT_PROVIDER_ENV]) ??
      "shell";
    const defaultRuntimeCwd = await resolveDefaultRuntimeCwdForCompany(ctx.db, company.id);
    await mkdir(defaultRuntimeCwd, { recursive: true });
    const requestedModel = parsed.data.runtimeModel?.trim() || process.env[DEFAULT_AGENT_MODEL_ENV]?.trim() || undefined;
    const resolvedRuntimeModel = resolveRuntimeModelForProvider(
      providerType,
      await resolveOpencodeRuntimeModel(
        providerType,
        normalizeRuntimeConfig({
          defaultRuntimeCwd,
          runtimeConfig: {
            runtimeModel: requestedModel,
            runtimeEnv: resolveSeedRuntimeEnv(providerType)
          }
        })
      )
    );
    const defaultRuntimeConfig = normalizeRuntimeConfig({
      defaultRuntimeCwd,
      runtimeConfig: {
        runtimeModel: resolvedRuntimeModel,
        bootstrapPrompt: buildDefaultCeoBootstrapPrompt(),
        runtimeEnv: resolveSeedRuntimeEnv(providerType),
        ...(providerType === "shell"
          ? {
              runtimeCommand: "echo",
              runtimeArgs: ["ceo bootstrap heartbeat"]
            }
          : {})
      }
    });
    await createAgent(ctx.db, {
      companyId: company.id,
      role: "CEO",
      roleKey: "ceo",
      title: "CEO",
      capabilities:
        "Company leadership: priorities, hiring, governance, and aligning agents to mission and budget.",
      name: "CEO",
      providerType,
      heartbeatCron: "*/5 * * * *",
      monthlyBudgetUsd: "100.0000",
      canHireAgents: true,
      ...runtimeConfigToDb(defaultRuntimeConfig),
      initialState: runtimeConfigToStateBlobPatch(defaultRuntimeConfig)
    });
    await ensureCompanyBuiltinPluginDefaults(ctx.db, company.id);
    await ensureCompanyBuiltinTemplateDefaults(ctx.db, company.id);
    return sendOk(res, company);
  });

  router.put("/:companyId", requireCompanyWriteAccess, async (req, res) => {
    const parsed = updateCompanySchema.safeParse(req.body);
    if (!parsed.success) {
      return sendError(res, parsed.error.message, 422);
    }

    const companyId = readCompanyIdParam(req);
    if (!companyId) {
      return sendError(res, "Missing company id.", 422);
    }
    const company = await updateCompany(ctx.db, { id: companyId, ...parsed.data });
    if (!company) {
      return sendError(res, "Company not found.", 404);
    }
    return sendOk(res, company);
  });

  router.delete("/:companyId", requireCompanyWriteAccess, async (req, res) => {
    const companyId = readCompanyIdParam(req);
    if (!companyId) {
      return sendError(res, "Missing company id.", 422);
    }
    const deleted = await deleteCompany(ctx.db, companyId);
    if (!deleted) {
      return sendError(res, "Company not found.", 404);
    }
    return sendOk(res, { deleted: true });
  });

  return router;
}

function requireCompanyWriteAccess(req: Request, res: Response, next: NextFunction) {
  const targetCompanyId = readCompanyIdParam(req);
  if (!targetCompanyId) {
    return sendError(res, "Missing company id.", 422);
  }
  if (!canAccessCompany(req, targetCompanyId)) {
    return sendError(res, "Actor does not have access to this company.", 403);
  }
  if (req.actor?.type === "board") {
    next();
    return;
  }
  return requirePermission("companies:write")(req, res, next);
}

function readCompanyIdParam(req: Request) {
  return typeof req.params.companyId === "string" ? req.params.companyId : null;
}

function parseAgentProvider(value: unknown) {
  if (
    value === "codex" ||
    value === "claude_code" ||
    value === "cursor" ||
    value === "gemini_cli" ||
    value === "opencode" ||
    value === "openai_api" ||
    value === "anthropic_api" ||
    value === "http" ||
    value === "shell"
  ) {
    return value;
  }
  return null;
}

function resolveSeedRuntimeEnv(providerType: string): Record<string, string> {
  if (providerType === "codex" || providerType === "openai_api") {
    const key = (process.env.BOPO_OPENAI_API_KEY ?? process.env.OPENAI_API_KEY)?.trim();
    return key ? { OPENAI_API_KEY: key } : {};
  }
  if (providerType === "claude_code" || providerType === "anthropic_api") {
    const key = (process.env.BOPO_ANTHROPIC_API_KEY ?? process.env.ANTHROPIC_API_KEY)?.trim();
    return key ? { ANTHROPIC_API_KEY: key } : {};
  }
  return {};
}
