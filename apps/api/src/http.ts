import type { Response } from "express";

export function sendOk<T>(res: Response, data: T) {
  return res.status(200).json({ ok: true, data });
}

export function sendError(res: Response, message: string, code = 400) {
  return res.status(code).json({ ok: false, error: message });
}
