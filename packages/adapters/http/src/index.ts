import type { AdapterMetadata, AdapterModule } from "../../../agent-sdk/src/types";
import * as server from "./server/index";
import * as ui from "./ui/index";
import * as cli from "./cli/index";

export const type = "http" as const;
export const label = "HTTP";
export const models = [] as const;
export const agentConfigurationDoc = `Use when:
- You need a custom HTTP-backed runtime wrapper.

Do not use when:
- You need a built-in local coding runtime.`;

export const metadata: AdapterMetadata = {
  providerType: type,
  label,
  supportsModelSelection: false,
  supportsEnvironmentTest: false,
  supportsWebSearch: false,
  supportsThinkingEffort: false,
  requiresRuntimeCwd: false
};

export const httpAdapterModule: AdapterModule = {
  type,
  label,
  metadata,
  models: [...models],
  agentConfigurationDoc,
  server: { type, execute: server.execute, listModels: server.listModels, testEnvironment: server.testEnvironment },
  ui: { type, parseStdoutLine: ui.parseStdoutLine, buildAdapterConfig: ui.buildAdapterConfig },
  cli: { type, formatStdoutEvent: cli.formatStdoutEvent }
};
