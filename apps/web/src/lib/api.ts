import type { RealtimeChannel } from "bopodev-contracts";

const apiBase = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4020";

type ApiSuccess<T> = { ok: true; data: T };
type ApiFailure = { ok: false; error?: string };
type ApiEnvelope<T> = ApiSuccess<T> | ApiFailure;

export class ApiError extends Error {
  status: number;
  requestId?: string;
  traceId?: string;
  durationMs?: number;

  constructor(message: string, status: number, metadata?: { requestId?: string; traceId?: string; durationMs?: number }) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.requestId = metadata?.requestId;
    this.traceId = metadata?.traceId;
    this.durationMs = metadata?.durationMs;
  }
}

async function parseApiResponse<T>(
  response: Response,
  metadata: { traceId: string; startedAt: number }
): Promise<ApiEnvelope<T>> {
  const requestId = response.headers.get("x-request-id") ?? undefined;
  const durationMs = Date.now() - metadata.startedAt;
  const contentType = response.headers.get("content-type") ?? "";
  const rawBody =
    response.status === 204 || response.status === 205 ? "" : await response.text();

  if (response.ok && rawBody.trim().length === 0) {
    return { ok: true, data: undefined as T };
  }

  if (!contentType.includes("application/json")) {
    if (!response.ok) {
      throw new ApiError(`Request failed with status ${response.status}`, response.status, {
        requestId,
        traceId: metadata.traceId,
        durationMs
      });
    }
    throw new ApiError("Unexpected response format from API.", response.status, {
      requestId,
      traceId: metadata.traceId,
      durationMs
    });
  }

  let payload: ApiEnvelope<T>;
  try {
    payload = JSON.parse(rawBody) as ApiEnvelope<T>;
  } catch {
    throw new ApiError("Unexpected response format from API.", response.status, {
      requestId,
      traceId: metadata.traceId,
      durationMs
    });
  }

  if (!response.ok || payload.ok === false) {
    const message =
      "error" in payload && payload.error
        ? payload.error
        : `Request failed with status ${response.status}`;
    throw new ApiError(message, response.status, {
      requestId,
      traceId: metadata.traceId,
      durationMs
    });
  }

  return payload;
}

export async function apiGet<T>(path: string, companyId?: string | null): Promise<ApiSuccess<T>> {
  return requestWithRetry<T>("GET", path, companyId);
}

export async function apiPost<T>(path: string, companyId: string, body: Record<string, unknown>): Promise<ApiSuccess<T>> {
  return requestWithRetry<T>("POST", path, companyId, body);
}

export async function apiPostFormData<T>(path: string, companyId: string, body: FormData): Promise<ApiSuccess<T>> {
  return requestWithRetry<T>("POST", path, companyId, body);
}

export async function apiPut<T>(path: string, companyId: string, body: Record<string, unknown>): Promise<ApiSuccess<T>> {
  return requestWithRetry<T>("PUT", path, companyId, body);
}

export async function apiDelete<T>(path: string, companyId: string): Promise<ApiSuccess<T>> {
  return requestWithRetry<T>("DELETE", path, companyId);
}

export function getRealtimeUrl(companyId: string, channels: RealtimeChannel[]) {
  const url = new URL("/realtime", apiBase);
  url.protocol = url.protocol === "https:" ? "wss:" : "ws:";
  url.searchParams.set("companyId", companyId);
  url.searchParams.set("channels", channels.join(","));
  return url.toString();
}

export function getRealtimeProtocols() {
  const token = readActorToken();
  if (!token) {
    return ["bopo.v1"];
  }
  return ["bopo.v1", `bopo-token.${encodeURIComponent(token)}`];
}

async function requestWithRetry<T>(
  method: "GET" | "POST" | "PUT" | "DELETE",
  path: string,
  companyId?: string | null,
  body?: Record<string, unknown> | FormData
) {
  const traceId = createTraceId();
  const retryBudget = method === "GET" ? 2 : 0;
  const startedAt = Date.now();
  let attempt = 0;
  for (;;) {
    attempt += 1;
    try {
      const response = await fetch(`${apiBase}${path}`, {
        method,
        headers: {
          ...(body && !(body instanceof FormData) ? { "content-type": "application/json" } : {}),
          ...(companyId ? { "x-company-id": companyId } : {}),
          "x-client-trace-id": traceId,
          ...(readActorToken() ? { authorization: `Bearer ${readActorToken()}` } : {})
        },
        ...(method === "GET" ? { cache: "no-store" } : {}),
        ...(body ? { body: body instanceof FormData ? body : JSON.stringify(body) } : {})
      });

      if (method === "GET" && response.status >= 500 && attempt <= retryBudget) {
        await delay(attempt * 200);
        continue;
      }

      return parseApiResponse<T>(response, { traceId, startedAt }) as Promise<ApiSuccess<T>>;
    } catch (error) {
      if (method !== "GET" || attempt > retryBudget || error instanceof ApiError) {
        throw error;
      }
      await delay(attempt * 200);
    }
  }
}

function readActorToken() {
  const fromEnv = process.env.NEXT_PUBLIC_BOPO_ACTOR_TOKEN?.trim();
  if (typeof window === "undefined") {
    return fromEnv || "";
  }
  const fromStorage = window.localStorage.getItem("bopo.actorToken")?.trim();
  return fromStorage || fromEnv || "";
}

function createTraceId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `trace-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function delay(ms: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, ms));
}
