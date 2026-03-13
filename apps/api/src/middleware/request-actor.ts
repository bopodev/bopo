import type { NextFunction, Request, Response } from "express";
import { RequestActorHeadersSchema } from "bopodev-contracts";
import { sendError } from "../http";
import { verifyActorToken } from "../security/actor-token";
import { isAuthenticatedMode, resolveDeploymentMode } from "../security/deployment-mode";

export type RequestActor = {
  type: "board" | "member" | "agent";
  id: string;
  companyIds: string[] | null;
  permissions: string[];
};

declare global {
  namespace Express {
    interface Request {
      actor?: RequestActor;
      companyId?: string;
      requestId?: string;
    }
  }
}

export function attachRequestActor(req: Request, res: Response, next: NextFunction) {
  const deploymentMode = resolveDeploymentMode();
  const tokenSecret = process.env.BOPO_AUTH_TOKEN_SECRET?.trim() || "";
  const tokenIdentity = tokenSecret
    ? verifyActorToken(readBearerToken(req.header("authorization")) ?? req.header("x-bopo-actor-token"), tokenSecret)
    : null;
  if (tokenIdentity) {
    req.actor = {
      type: tokenIdentity.type,
      id: tokenIdentity.id,
      companyIds: tokenIdentity.companyIds,
      permissions: tokenIdentity.permissions
    };
    next();
    return;
  }

  const actorHeadersResult = RequestActorHeadersSchema.safeParse({
    "x-actor-type": req.header("x-actor-type")?.trim().toLowerCase(),
    "x-actor-id": req.header("x-actor-id")?.trim(),
    "x-actor-companies": req.header("x-actor-companies")?.trim(),
    "x-actor-permissions": req.header("x-actor-permissions")?.trim()
  });
  if (!actorHeadersResult.success) {
    return sendError(
      res,
      `Invalid actor headers: ${actorHeadersResult.error.issues
        .map((issue) => `${issue.path.join(".") || "<root>"} ${issue.message}`)
        .join("; ")}`,
      400
    );
  }
  const actorHeaders = actorHeadersResult.data;
  const companyIds = parseCommaList(actorHeaders["x-actor-companies"]);
  const permissions = parseCommaList(actorHeaders["x-actor-permissions"]) ?? [];
  const hasActorHeaders = Boolean(
    actorHeaders["x-actor-type"] ||
      actorHeaders["x-actor-id"] ||
      (companyIds && companyIds.length > 0) ||
      permissions.length > 0
  );
  const allowLocalBoardFallback =
    deploymentMode === "local" && process.env.NODE_ENV !== "production" && process.env.BOPO_ALLOW_LOCAL_BOARD_FALLBACK !== "0";
  const trustActorHeaders = deploymentMode === "local" || process.env.BOPO_TRUST_ACTOR_HEADERS === "1";
  const bootstrapSecret = process.env.BOPO_AUTH_BOOTSTRAP_SECRET?.trim();
  const bootstrapHeader = req.header("x-bopo-bootstrap-secret")?.trim();
  const allowBootstrapTokenIssue =
    req.method === "POST" &&
    req.path === "/auth/actor-token" &&
    Boolean(bootstrapSecret && bootstrapHeader && bootstrapSecret === bootstrapHeader);
  if (isAuthenticatedMode(deploymentMode) && !hasActorHeaders && !tokenIdentity) {
    if (allowBootstrapTokenIssue) {
      req.actor = {
        type: "board",
        id: "bootstrap-secret",
        companyIds: null,
        permissions: []
      };
      next();
      return;
    }
    return sendError(
      res,
      "Missing actor identity. Provide Authorization Bearer actor token or trusted x-actor-* headers.",
      401
    );
  }
  if (isAuthenticatedMode(deploymentMode) && hasActorHeaders && !trustActorHeaders) {
    return sendError(
      res,
      "x-actor-* headers are disabled in authenticated mode. Set BOPO_TRUST_ACTOR_HEADERS=1 only behind a trusted proxy.",
      401
    );
  }
  const actorType = hasActorHeaders
    ? actorHeaders["x-actor-type"] ?? "member"
    : allowLocalBoardFallback
      ? "board"
      : "member";
  const actorId = hasActorHeaders
    ? actorHeaders["x-actor-id"] || "unknown-actor"
    : allowLocalBoardFallback
      ? "local-board"
      : "anonymous-member";

  req.actor = {
    type: actorType,
    id: actorId,
    companyIds: actorType === "board" ? null : companyIds ?? [],
    permissions
  };
  next();
}

function readBearerToken(value: string | undefined) {
  const trimmed = value?.trim();
  if (!trimmed) {
    return null;
  }
  const lower = trimmed.toLowerCase();
  if (!lower.startsWith("bearer ")) {
    return null;
  }
  return trimmed.slice("bearer ".length).trim() || null;
}

export function requirePermission(permission: string) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!hasPermission(req, permission)) {
      return sendError(res, `Missing permission: ${permission}`, 403);
    }
    next();
  };
}

export function requireBoardRole(req: Request, res: Response, next: NextFunction) {
  if (req.actor?.type !== "board") {
    return sendError(res, "Board role required.", 403);
  }
  next();
}

export function canAccessCompany(req: Request, companyId: string) {
  const actor = req.actor;
  if (!actor) {
    return false;
  }
  if (actor.type === "board") {
    return true;
  }
  return actor.companyIds?.includes(companyId) ?? false;
}

function hasPermission(req: Request, permission: string) {
  const actor = req.actor;
  if (!actor) {
    return false;
  }
  if (actor.type === "board") {
    return true;
  }
  return actor.permissions.includes(permission);
}

function parseCommaList(value: string | undefined) {
  if (!value) {
    return null;
  }
  const normalized = value
    .split(",")
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0);
  return normalized.length > 0 ? normalized : null;
}
