import type { AgentRuntimeConfig, AdapterEnvironmentResult, AdapterModelOption } from "../../../../agent-sdk/src/types";
import { execute } from "./execute";
import { testEnvironment } from "./test";
import { listAdapterModels, testAdapterEnvironment, testDirectApiEnvironment } from "../../../../agent-sdk/src/adapters";

export { execute, testEnvironment };
export * from "./parse";

export async function listModels(runtime?: AgentRuntimeConfig): Promise<AdapterModelOption[]> {
  return listAdapterModels("claude_code", runtime);
}
