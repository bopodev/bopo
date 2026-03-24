import type { AdapterMetadata, AdapterModule } from "../../../agent-sdk/src/types";
import * as server from "./server/index";
import * as ui from "./ui/index";
import * as cli from "./cli/index";

export const type = "openclaw_gateway" as const;
export const label = "OpenClaw Gateway";
export const models = [] as const;
export const agentConfigurationDoc = `Use when:
- You run a self-hosted [OpenClaw](https://docs.openclaw.ai/) gateway and want Bopo heartbeats to invoke \`agent\` / \`agent.wait\` over the documented WebSocket protocol.

Configure:
- **Command**: WebSocket URL (e.g. \`ws://127.0.0.1:18789\`). Alternatively set \`OPENCLAW_GATEWAY_URL\` in runtime environment.
- **Runtime environment**: \`OPENCLAW_GATEWAY_TOKEN\` or \`OPENCLAW_GATEWAY_PASSWORD\` (required). Optional: \`OPENCLAW_AGENT_ID\`, \`OPENCLAW_SESSION_KEY\`, \`OPENCLAW_SESSION_KEY_STRATEGY\` (\`issue\` | \`run\` | \`fixed\`), \`OPENCLAW_AGENT_WAIT_MS\`, \`OPENCLAW_DEVICE_PRIVATE_KEY_PEM\` (stable device identity), \`BOPO_OPENCLAW_DISABLE_DEVICE_AUTH=1\` only if your gateway explicitly allows insecure mode.

Do not use when:
- You need a local CLI subprocess adapter — use Codex, Claude Code, or OpenCode instead.`;

export const metadata: AdapterMetadata = {
  providerType: type,
  label,
  supportsModelSelection: false,
  supportsEnvironmentTest: true,
  supportsWebSearch: false,
  supportsThinkingEffort: false,
  requiresRuntimeCwd: false
};

export const openclawGatewayAdapterModule: AdapterModule = {
  type,
  label,
  metadata,
  models: [...models],
  agentConfigurationDoc,
  server: { type, execute: server.execute, testEnvironment: server.testEnvironment },
  ui: { type, parseStdoutLine: ui.parseStdoutLine, buildAdapterConfig: ui.buildAdapterConfig },
  cli: { type, formatStdoutEvent: cli.formatStdoutEvent }
};
