import { URL } from "node:url";

export type DeploymentMode = "local" | "authenticated_private" | "authenticated_public";

const VALID_MODES = new Set<DeploymentMode>(["local", "authenticated_private", "authenticated_public"]);

export function resolveDeploymentMode(raw = process.env.BOPO_DEPLOYMENT_MODE): DeploymentMode {
  const normalized = raw?.trim() ?? "";
  if (!normalized) {
    return "local";
  }
  if (VALID_MODES.has(normalized as DeploymentMode)) {
    return normalized as DeploymentMode;
  }
  throw new Error(
    `Invalid BOPO_DEPLOYMENT_MODE '${normalized}'. Expected one of: local, authenticated_private, authenticated_public.`
  );
}

export function isAuthenticatedMode(mode: DeploymentMode) {
  return mode === "authenticated_private" || mode === "authenticated_public";
}

export function resolveAllowedOrigins(mode: DeploymentMode, raw = process.env.BOPO_ALLOWED_ORIGINS) {
  if (mode === "local") {
    return ["http://localhost:4010", "http://127.0.0.1:4010"] as string[];
  }
  const parsed = parseCommaList(raw);
  if (parsed.length === 0) {
    throw new Error(
      `BOPO_ALLOWED_ORIGINS is required in ${mode} mode. Example: https://bopo.example.com,https://admin.example.com`
    );
  }
  return parsed;
}

export function resolvePublicBaseUrl(raw = process.env.BOPO_PUBLIC_BASE_URL) {
  const value = raw?.trim() ?? "";
  if (!value) {
    return null;
  }
  try {
    return new URL(value);
  } catch {
    throw new Error(`BOPO_PUBLIC_BASE_URL must be a valid URL. Received: '${value}'.`);
  }
}

export function resolveAllowedHostnames(mode: DeploymentMode, raw = process.env.BOPO_ALLOWED_HOSTNAMES) {
  const hostnames = new Set(parseCommaList(raw));
  const publicUrl = resolvePublicBaseUrl();
  if (publicUrl?.hostname) {
    hostnames.add(publicUrl.hostname);
  }
  if (mode === "local" && hostnames.size === 0) {
    hostnames.add("localhost");
    hostnames.add("127.0.0.1");
  }
  if (isAuthenticatedMode(mode) && hostnames.size === 0) {
    throw new Error(`BOPO_ALLOWED_HOSTNAMES is required in ${mode} mode.`);
  }
  return Array.from(hostnames);
}

export function parseCommaList(value: string | undefined | null) {
  if (!value) {
    return [];
  }
  return value
    .split(",")
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0);
}
