import type { AdapterMetadata, AdapterModule } from "../../../agent-sdk/src/types";
import * as server from "./server/index";
import * as ui from "./ui/index";
import * as cli from "./cli/index";

export const type = "openai_api" as const;
export const label = "OpenAI API";
export const models = [
  {
    "id": "gpt-5",
    "label": "GPT-5"
  },
  {
    "id": "gpt-5-mini",
    "label": "GPT-5 Mini"
  },
  {
    "id": "gpt-5-nano",
    "label": "GPT-5 Nano"
  },
  {
    "id": "o3",
    "label": "o3"
  },
  {
    "id": "o4-mini",
    "label": "o4-mini"
  }
] as const;
export const agentConfigurationDoc = `Use when:
- You need direct provider API execution.
- Local CLI tooling is unavailable.

Do not use when:
- You need CLI-native tool execution in a workspace.
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

export const openaiapiAdapterModule: AdapterModule = {
  type,
  label,
  metadata,
  models: [...models],
  agentConfigurationDoc,
  server: { type, execute: server.execute, listModels: server.listModels, testEnvironment: server.testEnvironment },
  ui: { type, parseStdoutLine: ui.parseStdoutLine, buildAdapterConfig: ui.buildAdapterConfig },
  cli: { type, formatStdoutEvent: cli.formatStdoutEvent }
};
