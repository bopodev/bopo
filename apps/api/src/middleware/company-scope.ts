import type { NextFunction, Request, Response } from "express";
import { sendError } from "../http";
import { canAccessCompany } from "./request-actor";

export function requireCompanyScope(req: Request, res: Response, next: NextFunction) {
  const companyId = req.header("x-company-id") ?? req.query.companyId?.toString();
  if (!companyId) {
    return sendError(res, "Missing company scope. Provide x-company-id header.", 422);
  }
  if (!canAccessCompany(req, companyId)) {
    return sendError(res, "Actor does not have access to this company.", 403);
  }
  req.companyId = companyId;
  next();
}
