import { runRuntimeSupervisor } from "./runtime-supervisor.mjs";

const quiet = process.argv.includes("--quiet");

await runRuntimeSupervisor({
  mode: "start",
  quiet,
  openBrowser: resolveOpenBrowserFlag(),
  commandArgs: [
    "turbo",
    "--no-update-notifier",
    "start",
    "--filter=bopodev-api",
    "--filter=bopodev-web",
    "--env-mode=loose",
    ...(quiet ? ["--ui=stream", "--output-logs=errors-only", "--log-prefix=none"] : [])
  ],
  apiReadyTimeoutMs: Number(process.env.BOPO_API_READY_TIMEOUT_MS ?? "90000"),
  webReadyTimeoutMs: Number(process.env.BOPO_WEB_READY_TIMEOUT_MS ?? "120000"),
  readyRetryMs: Number(process.env.BOPO_READY_RETRY_MS ?? "500"),
  childShutdownTimeoutMs: Number(process.env.BOPO_RUNTIME_SHUTDOWN_TIMEOUT_MS ?? "15000")
});

function resolveOpenBrowserFlag() {
  if (process.env.BOPO_OPEN_BROWSER === "0") {
    return false;
  }
  if (process.env.BOPO_OPEN_BROWSER === "1") {
    return true;
  }
  return Boolean(process.stdout.isTTY) && !process.env.CI;
}
