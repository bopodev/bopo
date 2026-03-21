import type { NextFunction, Request, Response } from "express";

function isCrudMethod(method: string) {
  return method === "GET" || method === "POST" || method === "PUT" || method === "PATCH" || method === "DELETE";
}

export function attachCrudRequestLogging(req: Request, res: Response, next: NextFunction) {
  if (req.path === "/health") {
    next();
    return;
  }
  const method = req.method.toUpperCase();
  if (!isCrudMethod(method)) {
    next();
    return;
  }
  const startedAt = Date.now();
  res.on("finish", () => {
    const elapsedMs = Date.now() - startedAt;
    const timestamp = new Date().toTimeString().slice(0, 8);
    process.stderr.write(`[${timestamp}] INFO: ${method} ${req.originalUrl} ${res.statusCode} ${elapsedMs}ms\n`);
  });
  next();
}
