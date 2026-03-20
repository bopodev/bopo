import { runRuntimeSupervisor } from "./runtime-supervisor.mjs";

const RESET = "\x1b[0m";
const METHOD_COLORS = {
  GET: "\x1b[38;2;80;200;120m",
  POST: "\x1b[38;2;70;140;255m",
  PUT: "\x1b[38;2;245;180;70m",
  PATCH: "\x1b[38;2;190;120;255m",
  DELETE: "\x1b[38;2;255;90;90m",
  OPTIONS: "\x1b[38;2;120;190;255m",
  HEAD: "\x1b[38;2;150;170;200m"
};

const methodPattern = /\b(GET|POST|PUT|PATCH|DELETE|OPTIONS|HEAD)\b/g;

await runRuntimeSupervisor({
  mode: "dev",
  openBrowser: false,
  commandArgs: [
    "turbo",
    "--no-update-notifier",
    "dev",
    "--ui=stream",
    "--output-logs=new-only",
    "--log-prefix=none",
    "--env-mode=loose"
  ],
  extraEnv: {
    BOPO_SKIP_CODEX_PREFLIGHT: "1"
  },
  stdoutLineTransform: colorizeMethodTokens,
  stderrLineTransform: colorizeMethodTokens,
  apiReadyTimeoutMs: Number(process.env.BOPO_API_READY_TIMEOUT_MS ?? "60000"),
  webReadyTimeoutMs: Number(process.env.BOPO_WEB_READY_TIMEOUT_MS ?? "120000"),
  readyRetryMs: Number(process.env.BOPO_READY_RETRY_MS ?? "500"),
  childShutdownTimeoutMs: Number(process.env.BOPO_RUNTIME_SHUTDOWN_TIMEOUT_MS ?? "15000")
});

function colorizeMethodTokens(text) {
  return text.replace(methodPattern, (method) => {
    const color = METHOD_COLORS[method];
    return color ? `${color}${method}${RESET}` : method;
  });
}
