import type { AgentRuntimeConfig, AdapterEnvironmentResult } from "../../../../agent-sdk/src/types";
import { listAdapterModels, testAdapterEnvironment, testDirectApiEnvironment } from "../../../../agent-sdk/src/adapters";

export async function testEnvironment(runtime?: AgentRuntimeConfig): Promise<AdapterEnvironmentResult> {
  return testDirectApiEnvironment("openai_api", runtime);
}
