import type { AdapterMetadata, AdapterModule } from "../../../agent-sdk/src/types";
import * as server from "./server/index";
import * as ui from "./ui/index";
import * as cli from "./cli/index";

export const type = "codex" as const;
export const label = "Codex";
export const models = [
  {
    "id": "gpt-5.3-codex",
    "label": "GPT-5.3 Codex"
  },
  {
    "id": "gpt-5.3-codex-spark",
    "label": "GPT-5.3 Codex Spark"
  },
  {
    "id": "gpt-5",
    "label": "GPT-5"
  },
  {
    "id": "o3",
    "label": "o3"
  },
  {
    "id": "o4-mini",
    "label": "o4-mini"
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
    "id": "o3-mini",
    "label": "o3-mini"
  },
  {
    "id": "codex-mini-latest",
    "label": "Codex Mini"
  }
] as const;
export const agentConfigurationDoc = `Use when:
- You need Codex CLI execution against a local workspace.
- You want session-aware, tool-using coding runs.

Do not use when:
- The host cannot run Codex CLI.
- You only need direct provider API calls without CLI runtime behavior.`;

export const metadata: AdapterMetadata = {
  providerType: type,
  label,
  supportsModelSelection: true,
  supportsEnvironmentTest: true,
  supportsWebSearch: true,
  supportsThinkingEffort: true,
  requiresRuntimeCwd: true
};

export const codexAdapterModule: AdapterModule = {
  type,
  label,
  metadata,
  models: [...models],
  agentConfigurationDoc,
  server: { type, execute: server.execute, listModels: server.listModels, testEnvironment: server.testEnvironment },
  ui: { type, parseStdoutLine: ui.parseStdoutLine, buildAdapterConfig: ui.buildAdapterConfig },
  cli: { type, formatStdoutEvent: cli.formatStdoutEvent }
};
