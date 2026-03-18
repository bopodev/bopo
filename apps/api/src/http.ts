import type { Response } from "express";

export function sendOk<T>(res: Response, data: T) {
  return res.status(200).json({ ok: true, data });
}

export function sendOkValidated(
  res: Response,
  schema: {
    safeParse: (value: unknown) => {
      success: boolean;
      data?: unknown;
      error?: { issues?: Array<{ path?: unknown[]; message?: string }> };
    };
  },
  data: unknown,
  resourceName: string
) {
  const normalized = normalizeContractData(data);
  const parsed = schema.safeParse(normalized);
  if (!parsed.success) {
    return sendError(
      res,
      `Contract mismatch for ${resourceName}: ${(parsed.error?.issues ?? [])
        .map((issue) => `${(issue.path ?? []).join(".") || "<root>"} ${issue.message ?? "Invalid value"}`)
        .join("; ")}`,
      500
    );
  }
  return sendOk(res, parsed.data ?? normalized);
}

export function sendError(res: Response, message: string, code = 400) {
  return res.status(code).json({ ok: false, error: message });
}

function normalizeContractData(value: unknown) {
  const serialized = JSON.stringify(value, (_key, entry) => {
    if (entry instanceof Date) {
      return entry.toISOString();
    }
    return entry;
  });
  if (serialized === undefined) {
    return value;
  }
  return JSON.parse(serialized);
}
