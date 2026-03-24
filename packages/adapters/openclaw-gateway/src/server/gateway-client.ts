import { randomUUID } from "node:crypto";
import WebSocket from "ws";
import {
  buildOpenClawDeviceAuthPayloadV3,
  generateEphemeralDeviceIdentity,
  loadDeviceIdentityFromPrivateKeyPem,
  publicKeyRawBase64UrlFromPem,
  signDevicePayload,
  type OpenClawDeviceIdentity
} from "./device-auth";
import {
  extractUsageFromSessionsList,
  extractUsageFromSessionsUsage,
  type ParsedOpenClawSessionUsage
} from "./parse";

const PROTOCOL_VERSION = 3;

/** Matches OpenClaw CLI default operator scopes for `agent` / `agent.wait`. */
const DEFAULT_OPERATOR_SCOPES = [
  "operator.admin",
  "operator.read",
  "operator.write",
  "operator.approvals",
  "operator.pairing"
] as const;

const LOG_PREFIX = "[bopo-openclaw]";
const EVENT_PREFIX = "[bopo-openclaw:event]";

export class GatewayResponseError extends Error {
  readonly gatewayCode?: string;
  readonly gatewayDetails?: unknown;

  constructor(message: string, gatewayCode?: string, gatewayDetails?: unknown) {
    super(message);
    this.name = "GatewayResponseError";
    this.gatewayCode = gatewayCode;
    this.gatewayDetails = gatewayDetails;
  }
}

type Pending = {
  resolve: (value: unknown) => void;
  reject: (err: Error) => void;
  timer: ReturnType<typeof setTimeout>;
};

function asRecord(value: unknown): Record<string, unknown> | null {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return null;
  }
  return value as Record<string, unknown>;
}

function nonEmptyString(value: unknown): string | null {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
}

export type OpenClawGatewayRunOptions = {
  gatewayUrl: string;
  token?: string | null;
  password?: string | null;
  devicePrivateKeyPem?: string | null;
  /** When true, omit `device` on `connect` (gateway must allow disabled device auth). */
  disableDeviceAuth?: boolean;
  agentId?: string | null;
  /** For `sessionKeyStrategy: "fixed"` — OpenClaw session key string. */
  openclawSessionKey?: string | null;
  sessionKeyStrategy?: "issue" | "run" | "fixed";
  primaryIssueId?: string | null;
  /** OpenClaw `agent.timeout` (seconds). */
  agentTimeoutSec?: number | null;
  model?: string | null;
  message: string;
  idempotencyKey: string;
  connectTimeoutMs: number;
  agentWaitTimeoutMs: number;
  onStdoutLine: (line: string) => void;
  onTranscriptEvent?: (event: {
    kind: "system" | "assistant" | "thinking" | "tool_call" | "tool_result" | "result" | "stderr";
    label?: string;
    text?: string;
    payload?: string;
    signalLevel?: "high" | "medium" | "low" | "noise";
    groupKey?: string;
    source?: "stdout" | "stderr";
  }) => void;
  abortSignal?: AbortSignal;
};

export type OpenClawGatewayRunResult = {
  ok: boolean;
  summary: string;
  runId?: string;
  timedOut?: boolean;
  errorMessage?: string;
  tokenInput: number;
  tokenOutput: number;
  /** Cache / context read tokens when reported by `sessions.usage`. */
  cachedInputTokens: number;
  usdCost: number;
  model?: string | null;
  /** Resolved OpenClaw runtime model provider (e.g. anthropic), when available. */
  openclawModelProvider?: string | null;
  provider?: string | null;
  /** Where token/model/cost metadata came from, for traces. */
  openclawUsageSource?: ParsedOpenClawSessionUsage["source"] | "none";
};

function resolveOpenClawSessionKey(params: {
  strategy: "issue" | "run" | "fixed";
  primaryIssueId: string | null;
  runId: string;
  fixedKey: string | null;
}): string | null {
  if (params.strategy === "fixed") {
    return params.fixedKey?.trim() || null;
  }
  if (params.strategy === "run") {
    return `bopo:run:${params.runId}`;
  }
  if (params.strategy === "issue" && params.primaryIssueId) {
    return `bopo:issue:${params.primaryIssueId}`;
  }
  return null;
}

async function fetchOpenClawSessionUsageMetadata(
  sendRequest: (method: string, params: unknown, timeoutMs: number) => Promise<unknown>,
  sessionKey: string,
  timeoutMs: number
): Promise<ParsedOpenClawSessionUsage | null> {
  let fromList: ParsedOpenClawSessionUsage | null = null;
  try {
    const listPayload = await sendRequest(
      "sessions.list",
      { search: sessionKey.toLowerCase(), limit: 120 },
      timeoutMs
    );
    fromList = extractUsageFromSessionsList(listPayload, sessionKey);
  } catch {
    /* best-effort */
  }

  const listHasTokens =
    fromList !== null && (fromList.tokenInput > 0 || fromList.tokenOutput > 0);
  if (listHasTokens) {
    return fromList;
  }

  let fromUsage: ParsedOpenClawSessionUsage | null = null;
  try {
    const end = new Date();
    const start = new Date(end.getTime() - 30 * 24 * 60 * 60 * 1000);
    const startDate = start.toISOString().slice(0, 10);
    const endDate = end.toISOString().slice(0, 10);
    const usagePayload = await sendRequest(
      "sessions.usage",
      { key: sessionKey, startDate, endDate, limit: 10 },
      Math.max(timeoutMs, 60_000)
    );
    fromUsage = extractUsageFromSessionsUsage(usagePayload, sessionKey);
  } catch {
    /* best-effort */
  }

  if (fromUsage && (fromUsage.tokenInput > 0 || fromUsage.tokenOutput > 0)) {
    if (fromList?.model && !fromUsage.model) {
      return {
        ...fromUsage,
        model: fromList.model,
        modelProvider: fromUsage.modelProvider ?? fromList.modelProvider
      };
    }
    return fromUsage;
  }

  return fromList ?? fromUsage;
}

function extractAssistantSnippet(data: Record<string, unknown>): string {
  const direct =
    nonEmptyString(data.text) ??
    nonEmptyString(data.message) ??
    nonEmptyString(data.content) ??
    nonEmptyString(data.body);
  if (direct) {
    return direct;
  }
  const delta = asRecord(data.delta);
  if (delta) {
    const d = nonEmptyString(delta.text) ?? nonEmptyString(delta.content);
    if (d) {
      return d;
    }
  }
  return "";
}

function mapStreamToKind(stream: string): "assistant" | "thinking" | "tool_call" | "tool_result" | "stderr" {
  const s = stream.toLowerCase();
  if (s.includes("tool")) {
    return s.includes("result") ? "tool_result" : "tool_call";
  }
  if (s.includes("think")) {
    return "thinking";
  }
  if (s === "error") {
    return "stderr";
  }
  return "assistant";
}

export async function runOpenClawGatewayTurn(options: OpenClawGatewayRunOptions): Promise<OpenClawGatewayRunResult> {
  const {
    gatewayUrl,
    token,
    password,
    devicePrivateKeyPem,
    disableDeviceAuth,
    agentId,
    openclawSessionKey,
    sessionKeyStrategy = "issue",
    primaryIssueId,
    agentTimeoutSec,
    model,
    message,
    idempotencyKey,
    connectTimeoutMs,
    agentWaitTimeoutMs,
    onStdoutLine,
    onTranscriptEvent,
    abortSignal
  } = options;

  const log = (line: string) => {
    onStdoutLine(`${LOG_PREFIX} ${line.trimEnd()}\n`);
    onTranscriptEvent?.({
      kind: "system",
      text: line.trimEnd(),
      source: "stdout",
      signalLevel: "low"
    });
  };

  let challengeNonce: string | null = null;
  let deviceIdentity: OpenClawDeviceIdentity | null = null;

  const ws = new WebSocket(gatewayUrl, {
    handshakeTimeout: connectTimeoutMs
  });

  let wsClosed = false;
  const safeCloseWs = () => {
    if (wsClosed) {
      return;
    }
    wsClosed = true;
    try {
      ws.close();
    } catch {
      /* noop */
    }
  };

  const pending = new Map<string, Pending>();
  let aborted = false;

  const rejectAllPending = (err: Error) => {
    for (const [, p] of pending) {
      clearTimeout(p.timer);
      p.reject(err);
    }
    pending.clear();
  };

  const handleMessage = (raw: string) => {
    let msg: unknown;
    try {
      msg = JSON.parse(raw) as unknown;
    } catch {
      return;
    }
    const rec = asRecord(msg);
    if (!rec) {
      return;
    }
    const type = nonEmptyString(rec.type);
    if (type === "res") {
      const id = nonEmptyString(rec.id);
      if (!id) {
        return;
      }
      const slot = pending.get(id);
      if (!slot) {
        return;
      }
      clearTimeout(slot.timer);
      pending.delete(id);
      const ok = rec.ok === true;
      if (ok) {
        slot.resolve(rec.payload);
      } else {
        const errRec = asRecord(rec.error);
        const code = nonEmptyString(errRec?.code) ?? "gateway_error";
        const errMsg = nonEmptyString(errRec?.message) ?? "Gateway request failed";
        slot.reject(new GatewayResponseError(errMsg, code, errRec?.details));
      }
      return;
    }
    if (type === "event") {
      const eventName = nonEmptyString(rec.event);
      const payload = rec.payload;
      if (eventName === "connect.challenge") {
        const p = asRecord(payload);
        const nonce = nonEmptyString(p?.nonce);
        if (nonce) {
          challengeNonce = nonce;
        }
      }
      if (eventName === "agent") {
        const p = asRecord(payload);
        if (!p) {
          return;
        }
        const runIdEv = nonEmptyString(p.runId);
        const stream = nonEmptyString(p.stream) ?? "assistant";
        const data = asRecord(p.data) ?? {};
        const snippet = extractAssistantSnippet(data);
        const line = `${EVENT_PREFIX} run=${runIdEv ?? "?"} stream=${stream} ${
          snippet ? `text=${JSON.stringify(snippet.slice(0, 2000))}` : `data=${JSON.stringify(p.data).slice(0, 2000)}`
        }`;
        onStdoutLine(`${line}\n`);
        if (snippet) {
          onTranscriptEvent?.({
            kind: mapStreamToKind(stream),
            label: stream,
            text: snippet,
            source: "stdout",
            signalLevel: stream === "assistant" ? "high" : "medium"
          });
        }
      }
    }
  };

  const sendRequest = (method: string, params: unknown, timeoutMs: number): Promise<unknown> => {
    const id = randomUUID();
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        pending.delete(id);
        reject(new GatewayResponseError(`Request timed out: ${method}`, "timeout"));
      }, timeoutMs);
      pending.set(id, { resolve, reject, timer });
      ws.send(JSON.stringify({ type: "req", id, method, params }));
    });
  };

  try {
    await new Promise<void>((resolve, reject) => {
      const onAbort = () => {
        aborted = true;
        reject(new GatewayResponseError("OpenClaw gateway run aborted", "aborted"));
        try {
          safeCloseWs();
        } catch {
          /* noop */
        }
      };
      if (abortSignal?.aborted) {
        onAbort();
        return;
      }
      abortSignal?.addEventListener("abort", onAbort, { once: true });

      ws.on("message", (data) => handleMessage(data.toString()));
      ws.once("open", () => resolve());
      ws.once("error", (err) => reject(err instanceof Error ? err : new GatewayResponseError(String(err))));
      ws.once("close", () => {
        if (aborted) {
          return;
        }
        if (pending.size > 0) {
          rejectAllPending(new GatewayResponseError("WebSocket closed while requests were in flight", "ws_closed"));
        }
      });
    });
  } catch (e) {
    try {
      safeCloseWs();
    } catch {
      /* noop */
    }
    const msg = e instanceof Error ? e.message : String(e);
    return {
      ok: false,
      summary: `OpenClaw WebSocket failed: ${msg}`,
      tokenInput: 0,
      tokenOutput: 0,
      cachedInputTokens: 0,
      usdCost: 0,
      errorMessage: msg
    };
  }

  if (!disableDeviceAuth) {
    const challengeDeadline = Date.now() + Math.min(connectTimeoutMs, 30_000);
    while (!challengeNonce && Date.now() < challengeDeadline) {
      await new Promise((r) => setTimeout(r, 25));
    }
    if (!challengeNonce) {
      safeCloseWs();
      return {
        ok: false,
        summary: "Timed out waiting for connect.challenge from OpenClaw gateway.",
        tokenInput: 0,
        tokenOutput: 0,
        cachedInputTokens: 0,
        usdCost: 0,
        errorMessage: "connect.challenge timeout"
      };
    }

    try {
      deviceIdentity = devicePrivateKeyPem?.trim()
        ? loadDeviceIdentityFromPrivateKeyPem(devicePrivateKeyPem.trim())
        : generateEphemeralDeviceIdentity();
    } catch (e) {
      safeCloseWs();
      const msg = e instanceof Error ? e.message : String(e);
      return {
        ok: false,
        summary: `Invalid OpenClaw device key: ${msg}`,
        tokenInput: 0,
        tokenOutput: 0,
        cachedInputTokens: 0,
        usdCost: 0,
        errorMessage: msg
      };
    }
  }

  const auth: Record<string, string> = {};
  if (token?.trim()) {
    auth.token = token.trim();
  } else if (password?.trim()) {
    auth.password = password.trim();
  }

  const scopes = [...DEFAULT_OPERATOR_SCOPES];
  const signedAtMs = Date.now();
  const deviceBlock =
    !disableDeviceAuth && deviceIdentity && challengeNonce
      ? {
          id: deviceIdentity.deviceId,
          publicKey: publicKeyRawBase64UrlFromPem(deviceIdentity.publicKeyPem),
          signature: signDevicePayload(
            deviceIdentity.privateKeyPem,
            buildOpenClawDeviceAuthPayloadV3({
              deviceId: deviceIdentity.deviceId,
              clientId: "cli",
              clientMode: "backend",
              role: "operator",
              scopes: [...scopes],
              signedAtMs,
              token: auth.token ?? null,
              nonce: challengeNonce,
              platform: "node",
              deviceFamily: "server"
            })
          ),
          signedAt: signedAtMs,
          nonce: challengeNonce
        }
      : undefined;

  const connectParams: Record<string, unknown> = {
    minProtocol: PROTOCOL_VERSION,
    maxProtocol: PROTOCOL_VERSION,
    client: {
      id: "cli",
      version: "1.0.0",
      platform: "node",
      mode: "backend"
    },
    role: "operator",
    scopes,
    caps: [],
    commands: [],
    permissions: {},
    auth: Object.keys(auth).length > 0 ? auth : undefined,
    locale: "en-US",
    userAgent: "bopodev-openclaw-gateway/1.0"
  };
  if (deviceBlock) {
    connectParams.device = deviceBlock;
  }

  let hello: unknown;
  try {
    hello = await sendRequest("connect", connectParams, connectTimeoutMs);
  } catch (e) {
    safeCloseWs();
    const msg = e instanceof Error ? e.message : String(e);
    const ge = e instanceof GatewayResponseError ? e : null;
    return {
      ok: false,
      summary: `OpenClaw connect failed: ${msg}`,
      tokenInput: 0,
      tokenOutput: 0,
      cachedInputTokens: 0,
      usdCost: 0,
      errorMessage: msg,
      ...(ge?.gatewayCode ? { provider: ge.gatewayCode } : {})
    };
  }

  const helloRec = asRecord(hello);
  if (nonEmptyString(helloRec?.type) !== "hello-ok") {
    safeCloseWs();
    return {
      ok: false,
      summary: "OpenClaw connect returned unexpected payload (expected hello-ok).",
      tokenInput: 0,
      tokenOutput: 0,
      cachedInputTokens: 0,
      usdCost: 0,
      errorMessage: "invalid_hello"
    };
  }

  log(`connected protocol=${nonEmptyString(helloRec?.protocol) ?? String(PROTOCOL_VERSION)}`);

  const sessionKeyResolved = resolveOpenClawSessionKey({
    strategy: sessionKeyStrategy,
    primaryIssueId: primaryIssueId ?? null,
    runId: idempotencyKey,
    fixedKey: openclawSessionKey?.trim() ?? null
  });

  const agentParams: Record<string, unknown> = {
    message,
    idempotencyKey
  };
  if (agentId?.trim()) {
    agentParams.agentId = agentId.trim();
  }
  if (sessionKeyResolved) {
    agentParams.sessionKey = sessionKeyResolved;
  }
  if (model?.trim()) {
    agentParams.model = model.trim();
  }
  if (agentTimeoutSec != null && agentTimeoutSec > 0) {
    agentParams.timeout = Math.floor(agentTimeoutSec);
  }

  let accepted: unknown;
  try {
    accepted = await sendRequest("agent", agentParams, connectTimeoutMs);
  } catch (e) {
    safeCloseWs();
    const msg = e instanceof Error ? e.message : String(e);
    return {
      ok: false,
      summary: `OpenClaw agent request failed: ${msg}`,
      tokenInput: 0,
      tokenOutput: 0,
      cachedInputTokens: 0,
      usdCost: 0,
      errorMessage: msg
    };
  }

  const accRec = asRecord(accepted);
  const runId = nonEmptyString(accRec?.runId);
  const accStatus = (nonEmptyString(accRec?.status) ?? "").toLowerCase();
  log(`agent accepted runId=${runId ?? "?"} status=${accStatus || "unknown"}`);

  if (accStatus === "error") {
    safeCloseWs();
    const errText = nonEmptyString(accRec?.summary) ?? "OpenClaw agent rejected the request.";
    return {
      ok: false,
      summary: errText,
      runId: runId ?? undefined,
      tokenInput: 0,
      tokenOutput: 0,
      cachedInputTokens: 0,
      usdCost: 0,
      errorMessage: errText
    };
  }

  if (!runId) {
    safeCloseWs();
    return {
      ok: false,
      summary: "OpenClaw agent response missing runId.",
      tokenInput: 0,
      tokenOutput: 0,
      cachedInputTokens: 0,
      usdCost: 0,
      errorMessage: "missing_run_id"
    };
  }

  let waitPayload: unknown;
  try {
    waitPayload = await sendRequest(
      "agent.wait",
      { runId, timeoutMs: agentWaitTimeoutMs },
      connectTimeoutMs + agentWaitTimeoutMs
    );
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    safeCloseWs();
    return {
      ok: false,
      summary: `OpenClaw agent.wait failed: ${msg}`,
      runId,
      tokenInput: 0,
      tokenOutput: 0,
      cachedInputTokens: 0,
      usdCost: 0,
      errorMessage: msg
    };
  }

  const waitRec = asRecord(waitPayload);
  const waitStatus = (nonEmptyString(waitRec?.status) ?? "").toLowerCase();

  if (waitStatus === "timeout") {
    safeCloseWs();
    return {
      ok: false,
      summary: `OpenClaw agent run timed out after ${agentWaitTimeoutMs}ms`,
      runId,
      timedOut: true,
      tokenInput: 0,
      tokenOutput: 0,
      cachedInputTokens: 0,
      usdCost: 0,
      errorMessage: "agent.wait timeout"
    };
  }

  if (waitStatus === "error") {
    safeCloseWs();
    const errText = nonEmptyString(waitRec?.error) ?? "OpenClaw agent run failed.";
    return {
      ok: false,
      summary: errText,
      runId,
      tokenInput: 0,
      tokenOutput: 0,
      cachedInputTokens: 0,
      usdCost: 0,
      errorMessage: errText
    };
  }

  if (waitStatus !== "ok") {
    safeCloseWs();
    return {
      ok: false,
      summary: `Unexpected agent.wait status: ${waitStatus || "unknown"}`,
      runId,
      tokenInput: 0,
      tokenOutput: 0,
      cachedInputTokens: 0,
      usdCost: 0,
      errorMessage: "agent_wait_status"
    };
  }

  log(`run completed runId=${runId} status=ok`);

  let usageMeta: ParsedOpenClawSessionUsage | null = null;
  if (sessionKeyResolved) {
    try {
      usageMeta = await fetchOpenClawSessionUsageMetadata(
        sendRequest,
        sessionKeyResolved,
        connectTimeoutMs
      );
      if (usageMeta) {
        log(
          `session usage source=${usageMeta.source} in=${usageMeta.tokenInput} out=${usageMeta.tokenOutput} model=${usageMeta.model ?? "?"}`
        );
      }
    } catch {
      /* best-effort */
    }
  }

  safeCloseWs();

  const resolvedModel = usageMeta?.model?.trim() || model?.trim() || null;
  const resolvedProvider = usageMeta?.modelProvider?.trim() || null;

  return {
    ok: true,
    summary: "OpenClaw gateway agent run completed.",
    runId,
    tokenInput: usageMeta?.tokenInput ?? 0,
    tokenOutput: usageMeta?.tokenOutput ?? 0,
    cachedInputTokens: usageMeta?.cachedInputTokens ?? 0,
    usdCost: usageMeta?.usdCost ?? 0,
    model: resolvedModel,
    openclawModelProvider: resolvedProvider,
    provider: "openclaw",
    openclawUsageSource: usageMeta?.source ?? "none"
  };
}
