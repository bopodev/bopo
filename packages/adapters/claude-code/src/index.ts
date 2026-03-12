import type { AdapterMetadata, AdapterModule } from "../../../agent-sdk/src/types";
import * as server from "./server/index";
import * as ui from "./ui/index";
import * as cli from "./cli/index";

export const type = "claude_code" as const;
export const label = "Claude Code";
export const models = [
  {
    "id": "claude-opus-4-6",
    "label": "Claude Opus 4.6"
  },
  {
    "id": "claude-sonnet-4-5-20250929",
    "label": "Claude Sonnet 4.5"
  },
  {
    "id": "claude-haiku-4-5-20251001",
    "label": "Claude Haiku 4.5"
  }
] as const;
export const agentConfigurationDoc = `Use when:
- You need Claude Code CLI execution in a local workspace.
- You want structured stream-json transcript parsing.

Do not use when:
- Claude CLI is unavailable on the host.
- You only need direct API execution.`;

export const metadata: AdapterMetadata = {
  providerType: type,
  label,
  supportsModelSelection: true,
  supportsEnvironmentTest: true,
  supportsWebSearch: false,
  supportsThinkingEffort: true,
  requiresRuntimeCwd: true
};

export const claudecodeAdapterModule: AdapterModule = {
  type,
  label,
  metadata,
  models: [...models],
  agentConfigurationDoc,
  server: { type, execute: server.execute, listModels: server.listModels, testEnvironment: server.testEnvironment },
  ui: { type, parseStdoutLine: ui.parseStdoutLine, buildAdapterConfig: ui.buildAdapterConfig },
  cli: { type, formatStdoutEvent: cli.formatStdoutEvent }
};
