import { access, copyFile, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { confirm, isCancel, log, select, spinner, text } from "@clack/prompts";
import dotenv from "dotenv";
import { runDoctorChecks, type DoctorCheck } from "../lib/checks";
import { resolveWorkspaceRoot, runCommandCapture, runCommandStreaming } from "../lib/process";
import { printBanner, printCheck, printDivider, printLine, printSection, printSummaryCard } from "../lib/ui";

export interface OnboardOptions {
  cwd: string;
  yes: boolean;
  start: boolean;
  forceInstall: boolean;
}

export interface OnboardFlowResult {
  workspaceRoot: string;
  envCreated: boolean;
  dbInitialized: boolean;
  checks: DoctorCheck[];
}

interface OnboardSeedResult {
  companyId: string;
  companyName: string;
  companyCreated: boolean;
  ceoCreated: boolean;
  ceoProviderType: AgentProvider;
  ceoMigrated: boolean;
}

type AgentProvider = "codex" | "claude_code" | "gemini_cli" | "opencode" | "openai_api" | "anthropic_api" | "shell";

interface OnboardDeps {
  installDependencies: (workspaceRoot: string) => Promise<void>;
  runDoctor: (workspaceRoot: string) => Promise<DoctorCheck[]>;
  initializeDatabase: (workspaceRoot: string, dbPath?: string) => Promise<void>;
  seedOnboardingDatabase: (
    workspaceRoot: string,
    input: { dbPath?: string; companyName: string; companyId?: string; agentProvider: AgentProvider }
  ) => Promise<OnboardSeedResult>;
  startServices: (workspaceRoot: string) => Promise<number | null>;
  promptForCompanyName: () => Promise<string>;
  promptForAgentProvider: () => Promise<AgentProvider>;
}

interface EnsureEnvResult {
  created: boolean;
  source: "example" | "default" | null;
}

const DEFAULT_COMPANY_NAME_ENV = "BOPO_DEFAULT_COMPANY_NAME";
const DEFAULT_COMPANY_ID_ENV = "BOPO_DEFAULT_COMPANY_ID";
const DEFAULT_PUBLIC_COMPANY_ID_ENV = "NEXT_PUBLIC_DEFAULT_COMPANY_ID";
const DEFAULT_AGENT_PROVIDER_ENV = "BOPO_DEFAULT_AGENT_PROVIDER";
const DEFAULT_DEPLOYMENT_MODE_ENV = "BOPO_DEPLOYMENT_MODE";
const DEFAULT_ENV_TEMPLATE = "NEXT_PUBLIC_API_URL=http://localhost:4020\n";
const CLI_ONBOARD_VISIBLE_PROVIDERS: Array<{ value: AgentProvider; label: string }> = [
  { value: "codex", label: "Codex" },
  { value: "claude_code", label: "Claude Code" },
  { value: "gemini_cli", label: "Gemini" },
  { value: "opencode", label: "OpenCode" }
];

const defaultDeps: OnboardDeps = {
  installDependencies: async (workspaceRoot) => {
    const code = await runCommandStreaming("pnpm", ["install"], { cwd: workspaceRoot });
    if (code !== 0) {
      throw new Error(`pnpm install failed with exit code ${String(code)}`);
    }
  },
  runDoctor: (workspaceRoot) => runDoctorChecks({ workspaceRoot }),
  initializeDatabase: async (workspaceRoot, dbPath) => {
    const code = await runCommandStreaming("pnpm", ["--filter", "bopodev-api", "db:init"], {
      cwd: workspaceRoot,
      env: {
        ...process.env,
        ...(dbPath ? { BOPO_DB_PATH: dbPath } : {})
      }
    });
    if (code !== 0) {
      throw new Error(`db:init failed with exit code ${String(code)}`);
    }
  },
  seedOnboardingDatabase: async (workspaceRoot, input) => {
    const result = await runCommandCapture("pnpm", ["--filter", "bopodev-api", "onboard:seed"], {
      cwd: workspaceRoot,
      env: {
        ...process.env,
        [DEFAULT_COMPANY_NAME_ENV]: input.companyName,
        [DEFAULT_AGENT_PROVIDER_ENV]: input.agentProvider,
        ...(input.companyId ? { [DEFAULT_COMPANY_ID_ENV]: input.companyId } : {}),
        ...(input.dbPath ? { BOPO_DB_PATH: input.dbPath } : {})
      }
    });
    if (!result.ok) {
      const details = [result.stderr, result.stdout].filter((value) => value.trim().length > 0).join("\n").trim();
      throw new Error(details.length > 0 ? details : `onboard:seed failed with exit code ${String(result.code)}`);
    }
    return parseSeedResult(result.stdout);
  },
  startServices: (workspaceRoot) => runCommandStreaming("pnpm", ["start:quiet"], { cwd: workspaceRoot }),
  promptForCompanyName: async () => {
    const answer = await text({
      message: "Default company name",
      placeholder: "Acme AI",
      validate: (value) => (value.trim().length > 0 ? undefined : "Company name is required.")
    });
    if (isCancel(answer)) {
      throw new Error("Onboarding cancelled.");
    }
    return answer.trim();
  },
  promptForAgentProvider: async () => {
    const answer = await select({
      message: "Primary agent framework",
      initialValue: "codex",
      options: CLI_ONBOARD_VISIBLE_PROVIDERS
    });
    if (isCancel(answer)) {
      throw new Error("Onboarding cancelled.");
    }
    const provider = parseAgentProvider(answer);
    if (!provider) {
      throw new Error("Invalid primary agent framework selected.");
    }
    return provider;
  }
};

export async function runOnboardFlow(options: OnboardOptions, deps: OnboardDeps = defaultDeps): Promise<OnboardFlowResult> {
  const workspaceRoot = await resolveWorkspaceRoot(options.cwd);
  if (!workspaceRoot) {
    throw new Error("Could not find a pnpm workspace root. Run this command from inside the Bopodev repo.");
  }

  printBanner();
  printSection("bopodev onboard");
  printLine(`Workspace: ${workspaceRoot}`);
  printDivider();

  if (!options.yes) {
    const answer = await confirm({
      message: "Run onboarding now?",
      initialValue: true
    });
    if (isCancel(answer) || !answer) {
      throw new Error("Onboarding cancelled.");
    }
  } else {
    log.step("`--yes` enabled: using defaults for optional onboarding steps.");
  }

  const shouldInstall = options.forceInstall || !(await hasExistingInstall(workspaceRoot));
  if (shouldInstall) {
    const installSpin = spinner();
    installSpin.start("Installing dependencies");
    await deps.installDependencies(workspaceRoot);
    installSpin.stop("Dependencies installed");
  } else {
    log.step("Dependencies already present. Skipping install (use --force-install to reinstall).");
  }

  const envSpin = spinner();
  envSpin.start("Ensuring .env exists");
  const envResult = await ensureEnvFile(workspaceRoot);
  const envCreated = envResult.created;
  if (!envResult.created) {
    envSpin.stop(".env already present");
  } else if (envResult.source === "example") {
    envSpin.stop("Created .env from .env.example");
  } else {
    envSpin.stop("Created .env with defaults (.env.example not found)");
  }
  const envPath = join(workspaceRoot, ".env");
  await sanitizeBlankDbPathEnvEntry(envPath);
  dotenv.config({ path: envPath });
  const envValues = await readEnvValues(envPath);
  const configuredDbPath = normalizeOptionalEnvValue(process.env.BOPO_DB_PATH);
  if (configuredDbPath) {
    process.env.BOPO_DB_PATH = configuredDbPath;
  } else {
    delete process.env.BOPO_DB_PATH;
  }
  const deploymentMode = envValues[DEFAULT_DEPLOYMENT_MODE_ENV]?.trim() ?? "";
  if (deploymentMode.length === 0 || deploymentMode !== "local") {
    await updateEnvFile(envPath, { [DEFAULT_DEPLOYMENT_MODE_ENV]: "local" });
    process.env[DEFAULT_DEPLOYMENT_MODE_ENV] = "local";
    printCheck(
      "ok",
      "Deployment mode",
      deploymentMode.length === 0 ? "local (defaulted for local onboarding)" : `local (was ${deploymentMode})`
    );
  } else {
    printCheck("ok", "Deployment mode", "local");
  }

  let companyName = envValues[DEFAULT_COMPANY_NAME_ENV]?.trim() ?? "";
  if (companyName.length > 0) {
    printCheck("ok", "Default company", companyName);
  } else {
    companyName = await deps.promptForCompanyName();
    await updateEnvFile(envPath, { [DEFAULT_COMPANY_NAME_ENV]: companyName });
    process.env[DEFAULT_COMPANY_NAME_ENV] = companyName;
    printCheck("ok", "Default company", companyName);
  }
  let agentProvider = parseAgentProvider(envValues[DEFAULT_AGENT_PROVIDER_ENV]);
  if (agentProvider) {
    printCheck("ok", "Primary agent framework", formatAgentProvider(agentProvider));
  } else {
    agentProvider = await deps.promptForAgentProvider();
    await updateEnvFile(envPath, { [DEFAULT_AGENT_PROVIDER_ENV]: agentProvider });
    process.env[DEFAULT_AGENT_PROVIDER_ENV] = agentProvider;
    printCheck("ok", "Primary agent framework", formatAgentProvider(agentProvider));
  }

  const dbSpin = spinner();
  dbSpin.start("Initializing local database");
  await deps.initializeDatabase(workspaceRoot, configuredDbPath);
  dbSpin.stop("Database initialized");

  const seedSpin = spinner();
  seedSpin.start("Ensuring default company and CEO agent");
  const seedResult = await deps.seedOnboardingDatabase(workspaceRoot, {
    dbPath: configuredDbPath,
    companyName,
    companyId: envValues[DEFAULT_COMPANY_ID_ENV]?.trim() || undefined,
    agentProvider
  });
  seedSpin.stop("Default company and CEO ready");
  await updateEnvFile(envPath, {
    [DEFAULT_COMPANY_NAME_ENV]: seedResult.companyName,
    [DEFAULT_COMPANY_ID_ENV]: seedResult.companyId,
    [DEFAULT_PUBLIC_COMPANY_ID_ENV]: seedResult.companyId,
    [DEFAULT_AGENT_PROVIDER_ENV]: seedResult.ceoProviderType
  });
  process.env[DEFAULT_COMPANY_NAME_ENV] = seedResult.companyName;
  process.env[DEFAULT_COMPANY_ID_ENV] = seedResult.companyId;
  process.env[DEFAULT_PUBLIC_COMPANY_ID_ENV] = seedResult.companyId;
  process.env[DEFAULT_AGENT_PROVIDER_ENV] = seedResult.ceoProviderType;
  printCheck("ok", "Configured company", `${seedResult.companyName}${seedResult.companyCreated ? " (created)" : ""}`);
  printCheck(
    "ok",
    "CEO agent",
    `${seedResult.ceoCreated ? "Created CEO" : seedResult.ceoMigrated ? "Migrated existing CEO" : "CEO already present"} (${formatAgentProvider(seedResult.ceoProviderType)})`
  );

  const doctorSpin = spinner();
  doctorSpin.start("Running doctor checks");
  const checks = await deps.runDoctor(workspaceRoot);
  doctorSpin.stop("Doctor checks complete");

  printDivider();
  printSection("Doctor");
  for (const check of checks) {
    printCheck(check.ok ? "ok" : "warn", check.label, check.details);
  }

  const passed = checks.filter((check) => check.ok).length;
  const failed = checks.length - passed;
  printLine("");
  printSummaryCard([
    `Summary: ${passed} passed, ${failed} warnings`,
    "Web URL: http://127.0.0.1:4010 (auto-fallback if occupied)",
    "API URL: http://127.0.0.1:4020 (auto-fallback if occupied)"
  ]);
  printLine("");

  if (options.start) {
    printSection("Starting services");
    printLine("Running `pnpm start:quiet` (production mode)...");
    printDivider();
    await deps.startServices(workspaceRoot);
  } else {
    printSection("Next commands");
    printLine("- Run: pnpm start:quiet (opens browser by default)");
    printLine("- Full logs: pnpm start");
    printLine("- Disable browser auto-open: BOPO_OPEN_BROWSER=0 pnpm start:quiet");
    printLine("- Diagnose: bopodev doctor");
  }

  return {
    workspaceRoot,
    envCreated,
    dbInitialized: true,
    checks
  };
}

async function ensureEnvFile(workspaceRoot: string): Promise<EnsureEnvResult> {
  const envPath = join(workspaceRoot, ".env");
  const envExamplePath = join(workspaceRoot, ".env.example");

  const envExists = await fileExists(envPath);
  if (envExists) {
    return { created: false, source: null };
  }

  const envExampleExists = await fileExists(envExamplePath);
  if (envExampleExists) {
    await copyFile(envExamplePath, envPath);
    return { created: true, source: "example" };
  }

  await writeFile(envPath, DEFAULT_ENV_TEMPLATE, "utf8");
  log.warn("Missing .env.example in workspace root. Created .env with built-in defaults.");
  return { created: true, source: "default" };
}

async function readEnvValues(envPath: string) {
  const envContent = await readFile(envPath, "utf8");
  return dotenv.parse(envContent);
}

async function updateEnvFile(envPath: string, updates: Record<string, string>) {
  const existingContent = await readFile(envPath, "utf8");
  const lines = existingContent.split(/\r?\n/);
  const nextLines = [...lines];

  for (const [key, value] of Object.entries(updates)) {
    const serialized = `${key}=${serializeEnvValue(value)}`;
    const existingIndex = nextLines.findIndex((line) => line.startsWith(`${key}=`));
    if (existingIndex >= 0) {
      nextLines[existingIndex] = serialized;
    } else {
      const insertionIndex = nextLines.length > 0 && nextLines[nextLines.length - 1] === "" ? nextLines.length - 1 : nextLines.length;
      nextLines.splice(insertionIndex, 0, serialized);
    }
  }

  const nextContent = nextLines.join("\n");
  await writeFile(envPath, nextContent.endsWith("\n") ? nextContent : `${nextContent}\n`, "utf8");
}

async function sanitizeBlankDbPathEnvEntry(envPath: string) {
  const existingContent = await readFile(envPath, "utf8");
  const lines = existingContent.split(/\r?\n/);
  let changed = false;
  const nextLines = lines.map((line) => {
    if (!line.startsWith("BOPO_DB_PATH=")) {
      return line;
    }
    const value = line.slice("BOPO_DB_PATH=".length).trim();
    if (value.length > 0) {
      return line;
    }
    changed = true;
    return "# BOPO_DB_PATH=  # optional override; leave unset to use default instance path";
  });
  if (!changed) {
    return;
  }
  const nextContent = nextLines.join("\n");
  await writeFile(envPath, nextContent.endsWith("\n") ? nextContent : `${nextContent}\n`, "utf8");
}

function serializeEnvValue(value: string) {
  return /[\s#"'`]/.test(value) ? JSON.stringify(value) : value;
}

function normalizeOptionalEnvValue(value: string | undefined) {
  const normalized = value?.trim();
  return normalized && normalized.length > 0 ? normalized : undefined;
}

function parseSeedResult(stdout: string): OnboardSeedResult {
  const lines = stdout
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
  const lastLine = lines[lines.length - 1];
  if (!lastLine) {
    throw new Error("onboard:seed did not return a result.");
  }
  const parsed = JSON.parse(lastLine) as Partial<OnboardSeedResult>;
  if (
    typeof parsed.companyId !== "string" ||
    typeof parsed.companyName !== "string" ||
    typeof parsed.companyCreated !== "boolean" ||
    typeof parsed.ceoCreated !== "boolean" ||
    typeof parsed.ceoMigrated !== "boolean" ||
    !parseAgentProvider(parsed.ceoProviderType)
  ) {
    throw new Error("onboard:seed returned an invalid result.");
  }
  return {
    companyId: parsed.companyId,
    companyName: parsed.companyName,
    companyCreated: parsed.companyCreated,
    ceoCreated: parsed.ceoCreated,
    ceoProviderType: parseAgentProvider(parsed.ceoProviderType) ?? "shell",
    ceoMigrated: parsed.ceoMigrated
  };
}

function parseAgentProvider(value: unknown): AgentProvider | null {
  if (
    value === "codex" ||
    value === "claude_code" ||
    value === "gemini_cli" ||
    value === "opencode" ||
    value === "openai_api" ||
    value === "anthropic_api" ||
    value === "shell"
  ) {
    return value;
  }
  return null;
}

function formatAgentProvider(provider: AgentProvider) {
  if (provider === "codex") {
    return "Codex";
  }
  if (provider === "claude_code") {
    return "Claude Code";
  }
  if (provider === "gemini_cli") {
    return "Gemini";
  }
  if (provider === "opencode") {
    return "OpenCode";
  }
  if (provider === "openai_api") {
    return "OpenAI API (direct)";
  }
  if (provider === "anthropic_api") {
    return "Anthropic API (direct)";
  }
  return "Shell Runtime";
}

async function fileExists(path: string): Promise<boolean> {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

async function hasExistingInstall(workspaceRoot: string): Promise<boolean> {
  const pnpmModulesFile = join(workspaceRoot, "node_modules", ".modules.yaml");
  const packageLockfile = join(workspaceRoot, "pnpm-lock.yaml");
  return (await fileExists(pnpmModulesFile)) && (await fileExists(packageLockfile));
}
