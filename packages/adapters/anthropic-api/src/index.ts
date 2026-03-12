import type { AdapterMetadata, AdapterModule } from "../../../agent-sdk/src/types";
import * as server from "./server/index";
import * as ui from "./ui/index";
import * as cli from "./cli/index";

export const type = "anthropic_api" as const;
export const label = "Anthropic API";
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
- You need direct provider API execution.
- Local CLI tooling is unavailable.

Do not use when:
- You need local CLI tools and workspace operations.
- API credentials are unavailable.`;

export const metadata: AdapterMetadata = {
  providerType: type,
  label,
  supportsModelSelection: true,
  supportsEnvironmentTest: true,
  supportsWebSearch: false,
  supportsThinkingEffort: false,
  requiresRuntimeCwd: false
};

export const anthropicapiAdapterModule: AdapterModule = {
  type,
  label,
  metadata,
  models: [...models],
  agentConfigurationDoc,
  server: { type, execute: server.execute, listModels: server.listModels, testEnvironment: server.testEnvironment },
  ui: { type, parseStdoutLine: ui.parseStdoutLine, buildAdapterConfig: ui.buildAdapterConfig },
  cli: { type, formatStdoutEvent: cli.formatStdoutEvent }
};
