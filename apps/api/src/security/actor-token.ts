import { createHmac, timingSafeEqual } from "node:crypto";

type ActorType = "board" | "member" | "agent";

export type ActorTokenPayload = {
  v: 1;
  iat: number;
  exp: number;
  actorType: ActorType;
  actorId: string;
  actorCompanies: string[] | null;
  actorPermissions: string[];
};

export type ActorIdentity = {
  type: ActorType;
  id: string;
  companyIds: string[] | null;
  permissions: string[];
};

export function issueActorToken(
  input: {
    actorType: ActorType;
    actorId: string;
    actorCompanies: string[] | null;
    actorPermissions: string[];
    ttlSec?: number;
  },
  secret: string
) {
  const nowSec = Math.floor(Date.now() / 1000);
  const ttlSec = Math.max(60, Math.min(86_400, input.ttlSec ?? 3_600));
  const payload: ActorTokenPayload = {
    v: 1,
    iat: nowSec,
    exp: nowSec + ttlSec,
    actorType: input.actorType,
    actorId: input.actorId.trim(),
    actorCompanies: input.actorType === "board" ? null : input.actorCompanies ?? [],
    actorPermissions: dedupe(input.actorPermissions)
  };
  const encodedPayload = encodeBase64Url(JSON.stringify(payload));
  const signature = sign(encodedPayload, secret);
  return `${encodedPayload}.${signature}`;
}

export function verifyActorToken(token: string | undefined | null, secret: string): ActorIdentity | null {
  const trimmed = token?.trim();
  if (!trimmed) {
    return null;
  }
  const [encodedPayload, encodedSignature] = trimmed.split(".");
  if (!encodedPayload || !encodedSignature) {
    return null;
  }
  const expectedSignature = sign(encodedPayload, secret);
  if (!safeStringEqual(expectedSignature, encodedSignature)) {
    return null;
  }
  const decoded = decodeBase64Url(encodedPayload);
  if (!decoded) {
    return null;
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(decoded);
  } catch {
    return null;
  }
  if (!parsed || typeof parsed !== "object") {
    return null;
  }
  const payload = parsed as Partial<ActorTokenPayload>;
  if (payload.v !== 1 || typeof payload.exp !== "number" || typeof payload.iat !== "number") {
    return null;
  }
  const nowSec = Math.floor(Date.now() / 1000);
  if (payload.exp < nowSec) {
    return null;
  }
  if (payload.actorType !== "board" && payload.actorType !== "member" && payload.actorType !== "agent") {
    return null;
  }
  if (typeof payload.actorId !== "string" || payload.actorId.trim().length === 0) {
    return null;
  }
  const companyIds =
    payload.actorType === "board"
      ? null
      : Array.isArray(payload.actorCompanies)
        ? payload.actorCompanies.filter((entry): entry is string => typeof entry === "string" && entry.trim().length > 0)
        : [];
  const permissions = Array.isArray(payload.actorPermissions)
    ? payload.actorPermissions.filter((entry): entry is string => typeof entry === "string" && entry.trim().length > 0)
    : [];
  return {
    type: payload.actorType,
    id: payload.actorId.trim(),
    companyIds,
    permissions: dedupe(permissions)
  };
}

function sign(encodedPayload: string, secret: string) {
  const digest = createHmac("sha256", secret).update(encodedPayload).digest("base64url");
  return digest;
}

function encodeBase64Url(value: string) {
  return Buffer.from(value, "utf8").toString("base64url");
}

function decodeBase64Url(value: string) {
  try {
    return Buffer.from(value, "base64url").toString("utf8");
  } catch {
    return null;
  }
}

function safeStringEqual(left: string, right: string) {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);
  if (leftBuffer.length !== rightBuffer.length) {
    return false;
  }
  return timingSafeEqual(leftBuffer, rightBuffer);
}

function dedupe(values: string[]) {
  return Array.from(new Set(values.map((entry) => entry.trim()).filter(Boolean)));
}
