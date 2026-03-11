import {
  AnthropicApiAdapter,
  ClaudeCodeAdapter,
  CodexAdapter,
  CursorAdapter,
  GenericHeartbeatAdapter,
  OpenAIApiAdapter,
  OpenCodeAdapter,
  listAdapterModels,
  listAdapterMetadata,
  testAdapterEnvironment
} from "./adapters";
import type {
  AdapterEnvironmentResult,
  AdapterMetadata,
  AdapterModelOption,
  AgentAdapter,
  AgentProviderType,
  AgentRuntimeConfig
} from "./types";

const adapters: Record<AgentProviderType, AgentAdapter> = {
  claude_code: new ClaudeCodeAdapter(),
  codex: new CodexAdapter(),
  cursor: new CursorAdapter(),
  opencode: new OpenCodeAdapter(),
  openai_api: new OpenAIApiAdapter(),
  anthropic_api: new AnthropicApiAdapter(),
  http: new GenericHeartbeatAdapter("http"),
  shell: new GenericHeartbeatAdapter("shell")
};

export function resolveAdapter(providerType: AgentProviderType) {
  return adapters[providerType];
}

export async function getAdapterModels(
  providerType: AgentProviderType,
  runtime?: AgentRuntimeConfig
): Promise<AdapterModelOption[]> {
  return listAdapterModels(providerType, runtime);
}

export function getAdapterMetadata(): AdapterMetadata[] {
  return listAdapterMetadata();
}

export async function runAdapterEnvironmentTest(
  providerType: AgentProviderType,
  runtime?: AgentRuntimeConfig
): Promise<AdapterEnvironmentResult> {
  return testAdapterEnvironment(providerType, runtime);
}
