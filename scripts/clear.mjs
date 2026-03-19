import { existsSync } from "node:fs";
import { readFile, rm, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import { join, resolve } from "node:path";
import { spawnSync } from "node:child_process";

const DEFAULT_INSTANCE_ID = "default";
const DEFAULT_BOPO_HOME_DIR = resolve(homedir(), ".bopodev");
const ONBOARDING_ENV_KEYS_TO_CLEAR = [
  "BOPO_DEFAULT_COMPANY_NAME",
  "BOPO_DEFAULT_COMPANY_ID",
  "NEXT_PUBLIC_DEFAULT_COMPANY_ID",
  "BOPO_DEFAULT_AGENT_PROVIDER",
  "BOPO_DEFAULT_AGENT_MODEL",
  "BOPO_DEFAULT_TEMPLATE_ID"
];

async function main() {
  const workspaceRoot = process.cwd();
  const envFromFile = await loadDotEnv(join(workspaceRoot, ".env"));
  applyEnvDefaults(envFromFile);

  const instanceRoot = resolveInstanceRoot(process.env);
  const dbPath = normalizeOptionalPath(process.env.BOPO_DB_PATH);

  logStep(`Removing instance folder: ${instanceRoot}`);
  await rm(instanceRoot, { recursive: true, force: true });

  if (dbPath && !isPathInside(instanceRoot, dbPath)) {
    logStep(`Removing explicit DB path: ${dbPath}`);
    await rm(dbPath, { recursive: true, force: true });
  }

  const envPath = join(workspaceRoot, ".env");
  await clearOnboardingEnvKeys(envPath, ONBOARDING_ENV_KEYS_TO_CLEAR);
  for (const key of ONBOARDING_ENV_KEYS_TO_CLEAR) {
    delete process.env[key];
  }

  runPnpm(["--filter", "bopodev-api", "db:init"]);

  logStep("Clear complete: instance reset and empty DB initialized.");
  logStep("Next: run `pnpm onboard` to choose a new company, provider, and model.");
}

function runPnpm(args) {
  const command = process.platform === "win32" ? "pnpm.cmd" : "pnpm";
  const result = spawnSync(command, args, {
    cwd: process.cwd(),
    stdio: "inherit",
    env: process.env
  });
  if (result.status !== 0) {
    throw new Error(`Command failed: pnpm ${args.join(" ")}`);
  }
}

function resolveInstanceRoot(env) {
  const configuredRoot = normalizeOptionalPath(env.BOPO_INSTANCE_ROOT);
  if (configuredRoot) {
    return configuredRoot;
  }
  const instanceId = env.BOPO_INSTANCE_ID?.trim() || DEFAULT_INSTANCE_ID;
  const homeDir = normalizeOptionalPath(env.BOPO_HOME) || DEFAULT_BOPO_HOME_DIR;
  return resolve(homeDir, "instances", instanceId);
}

function applyEnvDefaults(fileEnv) {
  for (const [key, value] of Object.entries(fileEnv)) {
    if (process.env[key] === undefined) {
      process.env[key] = value;
    }
  }
}

async function clearOnboardingEnvKeys(path, keys) {
  if (!existsSync(path)) {
    return;
  }
  const content = await readFile(path, "utf8");
  const nextLines = content
    .split(/\r?\n/)
    .filter((line) => !keys.some((key) => line.trimStart().startsWith(`${key}=`)));
  const nextContent = nextLines.join("\n");
  await writeFile(path, nextContent.endsWith("\n") ? nextContent : `${nextContent}\n`, "utf8");
}

async function loadDotEnv(path) {
  if (!existsSync(path)) {
    return {};
  }
  const content = await readFile(path, "utf8");
  const entries = {};
  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) {
      continue;
    }
    const equalIndex = line.indexOf("=");
    if (equalIndex <= 0) {
      continue;
    }
    const key = line.slice(0, equalIndex).trim();
    if (!key) {
      continue;
    }
    const value = stripWrappingQuotes(line.slice(equalIndex + 1).trim());
    entries[key] = value;
  }
  return entries;
}

function stripWrappingQuotes(value) {
  if (
    (value.startsWith("\"") && value.endsWith("\"")) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    return value.slice(1, -1);
  }
  return value;
}

function normalizeOptionalPath(value) {
  const normalized = value?.trim();
  if (!normalized) {
    return null;
  }
  if (normalized === "~") {
    return homedir();
  }
  if (normalized.startsWith("~/")) {
    return resolve(homedir(), normalized.slice(2));
  }
  return resolve(normalized);
}

function isPathInside(parent, target) {
  const relative = target.slice(parent.length);
  return target === parent || (target.startsWith(parent) && (relative.startsWith("/") || relative.startsWith("\\")));
}

function logStep(message) {
  // eslint-disable-next-line no-console
  console.log(`[clear] ${message}`);
}

void main().catch((error) => {
  // eslint-disable-next-line no-console
  console.error(`[clear] failed: ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
});
