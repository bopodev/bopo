#!/usr/bin/env node
import { Command } from "commander";
import { cancel, outro } from "@clack/prompts";
import { runDoctorCommand } from "./commands/doctor";
import { runIssueShellEnvCommand } from "./commands/issue-shell-env";
import { runOnboardFlow } from "./commands/onboard";
import { runStartCommand } from "./commands/start";
import { runUpgradeCommand } from "./commands/upgrade";

const program = new Command();

program.name("bopodev").description("Bopodev CLI");

program
  .command("onboard")
  .description("Install, configure, and start Bopodev locally")
  .option("--yes", "Run non-interactively using defaults", false)
  .option("--force-install", "Force reinstall dependencies even if already installed", false)
  .option("--template <template>", "Apply template by id or slug during onboarding")
  .option("--no-start", "Run setup and doctor checks without starting services")
  .action(async (options: { yes: boolean; start: boolean; forceInstall: boolean; template?: string }) => {
    try {
      await runOnboardFlow({
        cwd: process.cwd(),
        yes: options.yes,
        start: options.start,
        forceInstall: options.forceInstall,
        template: options.template
      });
      if (!options.start) {
        outro("Onboarding finished.");
      }
    } catch (error) {
      cancel(String(error));
      process.exitCode = 1;
    }
  });

program
  .command("start")
  .description("Start Bopodev without rerunning onboarding")
  .option("--full-logs", "Use full startup logs instead of quiet mode", false)
  .action(async (options: { fullLogs: boolean }) => {
    try {
      await runStartCommand(process.cwd(), { quiet: !options.fullLogs });
    } catch (error) {
      cancel(String(error));
      process.exitCode = 1;
    }
  });

program
  .command("doctor")
  .description("Run local preflight checks")
  .action(async () => {
    try {
      await runDoctorCommand(process.cwd());
      outro("Doctor finished.");
    } catch (error) {
      cancel(String(error));
      process.exitCode = 1;
    }
  });

const issueCommand = program.command("issue").description("Issue helpers for terminal workflows");
issueCommand
  .command("shell-env <issueId>")
  .description("Print shell exports for BOPODEV_* and cd to the project primary workspace cwd when set")
  .option("--api-url <url>", "API base URL", process.env.BOPODEV_API_URL ?? "http://localhost:4020")
  .option("--company-id <id>", "Company id (default: BOPODEV_COMPANY_ID)")
  .option("--json", "Print JSON instead of shell exports", false)
  .action(
    async (
      issueId: string,
      opts: { apiUrl: string; companyId?: string; json: boolean }
    ) => {
      try {
        const companyId = (opts.companyId ?? process.env.BOPODEV_COMPANY_ID ?? "").trim();
        if (!companyId) {
          cancel("Set --company-id or BOPODEV_COMPANY_ID.");
          process.exitCode = 1;
          return;
        }
        await runIssueShellEnvCommand(issueId, {
          apiUrl: opts.apiUrl,
          companyId,
          json: opts.json
        });
      } catch (error) {
        cancel(String(error));
        process.exitCode = 1;
      }
    }
  );

program
  .command("upgrade")
  .description("Stop local services, apply migrations, verify schema, and optionally restart")
  .option("--no-start", "Only migrate and verify without restarting services")
  .option("--full-logs", "Use full startup logs instead of quiet mode when restarting", false)
  .action(async (options: { start: boolean; fullLogs: boolean }) => {
    try {
      await runUpgradeCommand(process.cwd(), {
        start: options.start,
        quiet: !options.fullLogs
      });
      if (!options.start) {
        outro("Upgrade finished.");
      }
    } catch (error) {
      cancel(String(error));
      process.exitCode = 1;
    }
  });

void program.parseAsync(process.argv);
