import { resolveWorkspaceRoot, runCommandStreaming } from "../lib/process";

export async function runStartCommand(cwd: string, options?: { quiet?: boolean }) {
  const workspaceRoot = await resolveWorkspaceRoot(cwd);
  if (!workspaceRoot) {
    throw new Error("Could not find a pnpm workspace root. Run this command from inside the Bopodev repo.");
  }

  const script = options?.quiet === false ? "start" : "start:quiet";
  const code = await runCommandStreaming("pnpm", [script], { cwd: workspaceRoot });
  if (code !== 0) {
    throw new Error(`pnpm ${script} failed with exit code ${String(code)}`);
  }
}
