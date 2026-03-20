import { spawn } from "node:child_process";

const cliArgs = process.argv.slice(2).filter((arg, index) => !(arg === "--" && index === 1));

if (cliArgs.length === 0) {
  // eslint-disable-next-line no-console
  console.error("Missing CLI command. Usage: node scripts/cli-runner.mjs <command> [...args]");
  process.exit(1);
}

const child = spawn(
  "pnpm",
  ["--dir", "packages/cli", "exec", "node", "--import", "tsx", "src/index.ts", ...cliArgs],
  {
    stdio: "inherit",
    env: process.env
  }
);

child.on("exit", (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }
  process.exit(code ?? 0);
});
