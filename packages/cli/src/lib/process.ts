import { spawn } from "node:child_process";
import { access } from "node:fs/promises";
import { join, resolve } from "node:path";

export interface CommandResult {
  ok: boolean;
  code: number | null;
  stdout: string;
  stderr: string;
}

export async function commandExists(command: string): Promise<boolean> {
  const result = await runCommandCapture(command, ["--version"]);
  return result.ok;
}

export async function runCommandCapture(
  command: string,
  args: string[],
  options?: { cwd?: string; env?: NodeJS.ProcessEnv }
): Promise<CommandResult> {
  return new Promise((resolvePromise) => {
    const child = spawn(command, args, {
      cwd: options?.cwd ?? process.cwd(),
      env: options?.env ?? process.env,
      stdio: ["ignore", "pipe", "pipe"],
      shell: false
    });

    let stdout = "";
    let stderr = "";

    child.stdout.on("data", (chunk) => {
      stdout += String(chunk);
    });
    child.stderr.on("data", (chunk) => {
      stderr += String(chunk);
    });

    child.on("error", (error) => {
      resolvePromise({
        ok: false,
        code: null,
        stdout,
        stderr: `${stderr}\n${String(error)}`.trim()
      });
    });

    child.on("close", (code) => {
      resolvePromise({
        ok: code === 0,
        code,
        stdout,
        stderr
      });
    });
  });
}

export async function runCommandStreaming(
  command: string,
  args: string[],
  options?: { cwd?: string; env?: NodeJS.ProcessEnv }
): Promise<number | null> {
  return new Promise((resolvePromise, reject) => {
    const child = spawn(command, args, {
      cwd: options?.cwd ?? process.cwd(),
      env: options?.env ?? process.env,
      stdio: "inherit",
      shell: false
    });

    child.on("error", reject);
    child.on("close", (code) => resolvePromise(code));
  });
}

export async function resolveWorkspaceRoot(startDir: string): Promise<string | null> {
  let cursor = resolve(startDir);
  while (true) {
    const workspaceFile = join(cursor, "pnpm-workspace.yaml");
    const packageFile = join(cursor, "package.json");
    if ((await fileExists(workspaceFile)) && (await fileExists(packageFile))) {
      return cursor;
    }

    const parent = resolve(cursor, "..");
    if (parent === cursor) {
      return null;
    }
    cursor = parent;
  }
}

async function fileExists(path: string): Promise<boolean> {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}
