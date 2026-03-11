import { runDoctorChecks } from "../lib/checks";
import { resolveWorkspaceRoot } from "../lib/process";
import { printBanner, printCheck, printDivider, printLine, printSection, printSummaryCard } from "../lib/ui";

export async function runDoctorCommand(cwd: string) {
  const workspaceRoot = await resolveWorkspaceRoot(cwd);
  if (!workspaceRoot) {
    throw new Error("Could not find a pnpm workspace root. Run this command from inside the Bopodev repo.");
  }

  printBanner();
  printSection("bopodev doctor");
  printLine(`Workspace: ${workspaceRoot}`);
  printDivider();

  const checks = await runDoctorChecks({ workspaceRoot });
  for (const check of checks) {
    printCheck(check.ok ? "ok" : "warn", check.label, check.details);
  }

  const passed = checks.filter((check) => check.ok).length;
  const failed = checks.length - passed;
  printLine("");
  printSummaryCard([`Summary: ${passed} passed, ${failed} warnings`]);
}
