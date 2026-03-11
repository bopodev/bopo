import { describe, expect, it } from "vitest";
import {
  ControlPlaneHeadersJsonSchema,
  ControlPlaneRuntimeEnvSchema,
  ExecutionOutcomeSchema
} from "../packages/contracts/src/index";

describe("control-plane zod contracts", () => {
  it("rejects header json with control characters and missing required fields", () => {
    const parseResult = ControlPlaneHeadersJsonSchema.safeParse({
      "x-company-id": "demo-company",
      "x-actor-type": "agent",
      "x-actor-id": "agent-1",
      "x-actor-companies": "demo-company\u0000",
      "x-actor-permissions": ""
    });
    expect(parseResult.success).toBe(false);
  });

  it("requires either direct actor env vars or BOPODEV_REQUEST_HEADERS_JSON", () => {
    const parseResult = ControlPlaneRuntimeEnvSchema.safeParse({
      BOPODEV_AGENT_ID: "agent-1",
      BOPODEV_COMPANY_ID: "demo-company",
      BOPODEV_RUN_ID: "run-1",
      BOPODEV_API_BASE_URL: "http://127.0.0.1:4020"
    });
    expect(parseResult.success).toBe(false);
  });

  it("validates structured execution outcomes", () => {
    const parseResult = ExecutionOutcomeSchema.safeParse({
      kind: "completed",
      issueIdsTouched: ["issue-1"],
      artifacts: [{ path: "agents/engineer/AGENTS.md", kind: "doc" }],
      actions: [{ type: "runtime.execute", status: "ok", detail: "Execution completed." }],
      blockers: [],
      nextSuggestedState: "in_review"
    });
    expect(parseResult.success).toBe(true);
  });
});
