import { readFile } from "node:fs/promises";
import { homedir } from "node:os";
import { join, resolve } from "node:path";
import dotenv from "dotenv";
import { runStartCommand } from "./start";
import { resolveWorkspaceRootOrManaged, runCommandCapture } from "../lib/process";
import { printBanner, printCheck, printDivider, printLine, printSection, printSummaryCard } from "../lib/ui";

const UPGRADE_TIMEOUT_MS = 120_000;
const UNSTICK_TIMEOUT_MS = 30_000;

export async function runUpgradeCommand(
  cwd: string,
  options?: {
    start?: boolean;
    quiet?: boolean;
  }
) {
  const workspaceRoot = await resolveWorkspaceRootOrManaged(cwd);
  if (!workspaceRoot) {
    throw new Error("Could not find a Bopodev workspace root. Run `bopodev onboard` first.");
  }

  printBanner();
  printSection("bopodev upgrade");
  printLine(`Workspace: ${workspaceRoot}`);
  printDivider();

  const envPath = join(workspaceRoot, ".env");
  const envValues = await readEnvValues(envPath);
  const configuredDbPath = normalizeOptionalEnvValue(envValues.BOPO_DB_PATH);
  const dbPathSummary = resolveDbPathSummary(configuredDbPath);
  printCheck("warn", "Backup", `Back up local data before major upgrades if needed: ${dbPathSummary}`);

  const stopResult = await runCommandCapture("pnpm", ["unstick"], {
    cwd: workspaceRoot,
    timeoutMs: UNSTICK_TIMEOUT_MS
  });
  if (!stopResult.ok) {
    throw new Error(renderCommandFailure("pnpm unstick", stopResult.stderr, stopResult.stdout, stopResult.code));
  }
  printCheck("ok", "Runtime", "Stopped active local processes");

  const migrateResult = await runCommandCapture("pnpm", ["db:migrate"], {
    cwd: workspaceRoot,
    env: {
      ...process.env,
      ...(configuredDbPath ? { BOPO_DB_PATH: configuredDbPath } : {})
    },
    timeoutMs: UPGRADE_TIMEOUT_MS
  });
  if (!migrateResult.ok) {
    throw new Error(renderCommandFailure("pnpm db:migrate", migrateResult.stderr, migrateResult.stdout, migrateResult.code));
  }
  printCheck("ok", "Database", "Migrations applied and schema verified");

  printSummaryCard([
    `Mode    | local upgrade`,
    `DB      | ${dbPathSummary}`,
    `Status  | migrated`
  ]);

  if (options?.start === false) {
    printSection("Next commands");
    printLine("- Run: pnpm start:quiet");
    printLine("- Diagnose: pnpm doctor");
    return;
  }

  printLine("Restarting services after upgrade...");
  printDivider();
  await runStartCommand(workspaceRoot, { quiet: options?.quiet !== false });
}

async function readEnvValues(path: string) {
  try {
    const content = await readFile(path, "utf8");
    return dotenv.parse(content);
  } catch {
    return {};
  }
}

function normalizeOptionalEnvValue(value: string | undefined) {
  const normalized = value?.trim();
  return normalized && normalized.length > 0 ? normalized : undefined;
}

function resolveDbPathSummary(configuredDbPath: string | undefined) {
  if (configuredDbPath) {
    return resolve(expandHomePrefix(configuredDbPath));
  }
  const home = process.env.BOPO_HOME?.trim() ? expandHomePrefix(process.env.BOPO_HOME.trim()) : join(homedir(), ".bopodev");
  const instanceId = process.env.BOPO_INSTANCE_ID?.trim() || "default";
  return resolve(home, "instances", instanceId, "db", "postgres");
}

function expandHomePrefix(value: string) {
  if (value === "~") {
    return homedir();
  }
  if (value.startsWith("~/")) {
    return resolve(homedir(), value.slice(2));
  }
  return value;
}

function renderCommandFailure(command: string, stderr: string, stdout: string, code: number | null) {
  const details = [stderr, stdout].filter((value) => value.trim().length > 0).join("\n").trim();
  return details.length > 0 ? details : `${command} failed with exit code ${String(code)}`;
}
