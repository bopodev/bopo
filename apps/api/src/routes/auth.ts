import { Router } from "express";
import { z } from "zod";
import type { AppContext } from "../context";
import { sendError, sendOk } from "../http";
import { issueActorToken } from "../security/actor-token";
import { isAuthenticatedMode, resolveDeploymentMode } from "../security/deployment-mode";

const createActorTokenSchema = z.object({
  actorType: z.enum(["board", "member", "agent"]),
  actorId: z.string().trim().min(1),
  actorCompanies: z.array(z.string().trim().min(1)).default([]),
  actorPermissions: z.array(z.string().trim().min(1)).default([]),
  ttlSec: z.number().int().positive().max(86_400).optional()
});

export function createAuthRouter(ctx: AppContext) {
  const router = Router();

  router.post("/actor-token", (req, res) => {
    const parsed = createActorTokenSchema.safeParse(req.body);
    if (!parsed.success) {
      return sendError(res, parsed.error.message, 422);
    }
    const secret = process.env.BOPO_AUTH_TOKEN_SECRET?.trim();
    if (!secret) {
      return sendError(
        res,
        "Actor token support is not configured. Set BOPO_AUTH_TOKEN_SECRET in the API environment.",
        503
      );
    }
    const bootstrapSecret = process.env.BOPO_AUTH_BOOTSTRAP_SECRET?.trim();
    const headerSecret = req.header("x-bopo-bootstrap-secret")?.trim();
    const localMode = !isAuthenticatedMode(ctx.deploymentMode ?? resolveDeploymentMode());
    const bootstrapAllowed = localMode || (bootstrapSecret && headerSecret && bootstrapSecret === headerSecret);
    if (!bootstrapAllowed) {
      return sendError(res, "Actor token issuance requires bootstrap authorization.", 403);
    }

    const token = issueActorToken(
      {
        actorType: parsed.data.actorType,
        actorId: parsed.data.actorId,
        actorCompanies: parsed.data.actorType === "board" ? null : parsed.data.actorCompanies,
        actorPermissions: parsed.data.actorPermissions,
        ttlSec: parsed.data.ttlSec
      },
      secret
    );
    return sendOk(res, { token, expiresInSec: parsed.data.ttlSec ?? 3_600 });
  });

  return router;
}
