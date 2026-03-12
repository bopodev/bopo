import type { AgentRuntimeConfig, AdapterEnvironmentResult, AdapterModelOption } from "../../../../agent-sdk/src/types";
import { execute } from "./execute";
import { testEnvironment } from "./test";
import { listAdapterModels } from "../../../../agent-sdk/src/adapters";
import { models } from "../index";

export { execute, testEnvironment };
export * from "./parse";

export async function listModels(runtime?: AgentRuntimeConfig): Promise<AdapterModelOption[]> {
  const fromSdk = await listAdapterModels("gemini_cli", runtime);
  if (fromSdk.length > 0) return fromSdk;
  return [...models];
}
