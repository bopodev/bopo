#!/usr/bin/env node
/**
 * Minimal stdio JSON-RPC worker for the runtime-demo plugin (no build step).
 * Kept outside `dist/` so the repo root `.gitignore` does not exclude it.
 */
function send(id, result) {
  process.stdout.write(`${JSON.stringify({ jsonrpc: "2.0", id, result })}\n`);
}

function sendError(id, code, message) {
  process.stdout.write(`${JSON.stringify({ jsonrpc: "2.0", id, error: { code, message } })}\n`);
}

function toInvocation(summary) {
  return {
    status: "ok",
    summary,
    blockers: [],
    diagnostics: {
      source: "runtime-demo-worker"
    }
  };
}

let buffer = "";
process.stdin.setEncoding("utf8");
process.stdin.on("data", (chunk) => {
  buffer += chunk;
  let index = buffer.indexOf("\n");
  while (index >= 0) {
    const line = buffer.slice(0, index).trim();
    buffer = buffer.slice(index + 1);
    if (line.length > 0) {
      handle(line);
    }
    index = buffer.indexOf("\n");
  }
});

function handle(line) {
  let message;
  try {
    message = JSON.parse(line);
  } catch {
    return;
  }
  const id = typeof message.id === "string" ? message.id : "unknown";
  const method = typeof message.method === "string" ? message.method : "";
  const params = message.params && typeof message.params === "object" ? message.params : {};
  if (method === "plugin.health") {
    send(id, { status: "ok", message: "runtime-demo healthy" });
    return;
  }
  if (method === "plugin.hook") {
    send(id, toInvocation(`hook processed: ${String(params.hook ?? "unknown")}`));
    return;
  }
  if (method === "plugin.action") {
    send(id, { ok: true, actionKey: String(params.key ?? "unknown"), payload: params.payload ?? {} });
    return;
  }
  if (method === "plugin.data") {
    send(id, { ok: true, dataKey: String(params.key ?? "unknown"), payload: params.payload ?? {} });
    return;
  }
  if (method === "plugin.job") {
    send(id, toInvocation(`job processed: ${String(params.jobKey ?? "unknown")}`));
    return;
  }
  if (method === "plugin.webhook") {
    send(id, { ok: true, endpointKey: String(params.endpointKey ?? "unknown"), payload: params.payload ?? {} });
    return;
  }
  sendError(id, -32601, `Unsupported method: ${method}`);
}
