import type { AdapterMetadata, AdapterModule } from "../../../agent-sdk/src/types";
import * as server from "./server/index";
import * as ui from "./ui/index";
import * as cli from "./cli/index";

export const type = "gemini_cli" as const;
export const label = "Gemini CLI";
export const models = [
  { id: "gemini-2.5-pro", label: "Gemini 2.5 Pro" },
  { id: "gemini-2.5-flash", label: "Gemini 2.5 Flash" },
  { id: "gemini-2.5-flash-lite", label: "Gemini 2.5 Flash Lite" },
  { id: "gemini-3.1-flash-lite", label: "Gemini 3.1 Flash Lite" },
  { id: "gemini-3-flash", label: "Gemini 3 Flash" },
  { id: "gemini-3-pro", label: "Gemini 3 Pro" },
  { id: "gemini-3-pro-200k", label: "Gemini 3 Pro (>200k context)" }
] as const;

export const agentConfigurationDoc = `# Gemini CLI agent configuration

Adapter: gemini_cli

Use when:
- You want to run the Gemini CLI locally on the host machine.
- You want Gemini chat sessions resumed across heartbeats with --resume.
- You need Google Gemini model selection (e.g. 2.5 Pro, 2.5 Flash, 3 Flash).

Don't use when:
- You need webhook-style external invocation (use http adapter).
- You only need a one-shot script without an AI coding agent loop (use shell).
- Gemini CLI is not installed on the machine that runs the agent.

Core fields:
- cwd (string, optional): absolute working directory for the agent process.
- model (string, optional): Gemini model id (e.g. gemini-2.5-pro, gemini-2.5-flash).
- command (string, optional): defaults to "gemini".
- timeoutSec / timeoutMs (number, optional): run timeout.
- args (string[], optional): additional CLI args.

Notes:
- Runs use positional prompt; prompt is passed as the final argument.
- Sessions resume with --resume when stored session cwd matches the current cwd.
- Authentication can use GEMINI_API_KEY or GOOGLE_API_KEY.`;

export const metadata: AdapterMetadata = {
  providerType: type,
  label,
  supportsModelSelection: true,
  supportsEnvironmentTest: true,
  supportsWebSearch: false,
  supportsThinkingEffort: false,
  requiresRuntimeCwd: true
};

export const geminiCliAdapterModule: AdapterModule = {
  type,
  label,
  metadata,
  models: [...models],
  agentConfigurationDoc,
  server: {
    type,
    execute: server.execute,
    listModels: server.listModels,
    testEnvironment: server.testEnvironment
  },
  ui: {
    type,
    parseStdoutLine: ui.parseStdoutLine,
    buildAdapterConfig: ui.buildAdapterConfig
  },
  cli: { type, formatStdoutEvent: cli.formatStdoutEvent }
};
