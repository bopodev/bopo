import type { NextFunction, Request, Response } from "express";
import { nanoid } from "nanoid";

export function attachRequestId(req: Request, res: Response, next: NextFunction) {
  const requestId = req.header("x-request-id")?.trim() || nanoid(14);
  req.requestId = requestId;
  res.setHeader("x-request-id", requestId);
  next();
}
