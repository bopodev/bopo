import type { AdapterMetadata, AdapterModule } from "../../../agent-sdk/src/types";
import * as server from "./server/index";
import * as ui from "./ui/index";
import * as cli from "./cli/index";

export const type = "cursor" as const;
export const label = "Cursor";
export const models = [
  {
    "id": "auto",
    "label": "Auto"
  },
  {
    "id": "gpt-5.3-codex",
    "label": "gpt-5.3-codex"
  },
  {
    "id": "gpt-5.3-codex-fast",
    "label": "gpt-5.3-codex-fast"
  },
  {
    "id": "sonnet-4.5",
    "label": "sonnet-4.5"
  },
  {
    "id": "opus-4.6",
    "label": "opus-4.6"
  }
] as const;
export const agentConfigurationDoc = `Use when:
- You need Cursor agent CLI execution in a local workspace.
- You want Cursor session resume support.

Do not use when:
- Cursor agent tooling is not installed.
- You only need direct HTTP execution.`;

export const metadata: AdapterMetadata = {
  providerType: type,
  label,
  supportsModelSelection: true,
  supportsEnvironmentTest: true,
  supportsWebSearch: false,
  supportsThinkingEffort: false,
  requiresRuntimeCwd: true
};

export const cursorAdapterModule: AdapterModule = {
  type,
  label,
  metadata,
  models: [...models],
  agentConfigurationDoc,
  server: { type, execute: server.execute, listModels: server.listModels, testEnvironment: server.testEnvironment },
  ui: { type, parseStdoutLine: ui.parseStdoutLine, buildAdapterConfig: ui.buildAdapterConfig },
  cli: { type, formatStdoutEvent: cli.formatStdoutEvent }
};
