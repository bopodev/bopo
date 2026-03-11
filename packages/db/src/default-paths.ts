import { homedir } from "node:os";
import { join, resolve } from "node:path";

const DEFAULT_INSTANCE_ID = "default";
const SAFE_PATH_SEGMENT_RE = /^[a-zA-Z0-9_-]+$/;

function expandHomePrefix(value: string) {
  if (value === "~") {
    return homedir();
  }
  if (value.startsWith("~/")) {
    return resolve(homedir(), value.slice(2));
  }
  return value;
}

function normalizePath(raw: string) {
  return resolve(expandHomePrefix(raw.trim()));
}

export function resolveBopoHomeDir() {
  const configured = process.env.BOPO_HOME?.trim();
  if (configured) {
    return normalizePath(configured);
  }
  return resolve(homedir(), ".bopodev");
}

export function resolveBopoInstanceId() {
  const configured = process.env.BOPO_INSTANCE_ID?.trim() || DEFAULT_INSTANCE_ID;
  if (!SAFE_PATH_SEGMENT_RE.test(configured)) {
    throw new Error(`Invalid BOPO_INSTANCE_ID '${configured}'.`);
  }
  return configured;
}

export function resolveBopoInstanceRoot() {
  const configuredRoot = process.env.BOPO_INSTANCE_ROOT?.trim();
  if (configuredRoot) {
    return normalizePath(configuredRoot);
  }
  return join(resolveBopoHomeDir(), "instances", resolveBopoInstanceId());
}

export function resolveDefaultDbPath() {
  return join(resolveBopoInstanceRoot(), "db", "bopodev.db");
}
